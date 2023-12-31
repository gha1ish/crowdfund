const assert = require("assert");
const ganache = require("ganache-cli");
const Web3 = require("web3");
const web3 = new Web3(ganache.provider());

const compiledFactory = require("../token/build/PublicFundProjectFactory.json");
const compiledPublicFundProject = require("../token/build/PublicFundProject.json");

let accounts;
let factory;
let publicFundProjectAddress;
let publicFundProject;

beforeEach(async () => {
  accounts = await web3.eth.getAccounts();

  factory = await new web3.eth.Contract(compiledFactory.abi)
    .deploy({ data: compiledFactory.evm.bytecode.object })
    .send({ from: accounts[0], gas: "1400000" });

  await factory.methods.createPublicFundProject("100").send({
    from: accounts[0],
    gas: "1000000",
  });

  [publicFundProjectAddress] = await factory.methods
    .getDeployedPublicFundProjects()
    .call();
  publicFundProject = await new web3.eth.Contract(
    compiledPublicFundProject.abi,
    publicFundProjectAddress
  );
});

describe("PublicFundProjects", () => {
  it("deploys a factory and a publicFundProject", () => {
    assert.ok(factory.options.address);
    assert.ok(publicFundProject.options.address);
  });

  it("marks caller as the publicFundProject manager", async () => {
    const manager = await publicFundProject.methods.manager().call();
    assert.equal(accounts[0], manager);
  });

  it("allows people to contribute money and marks them as approvers", async () => {
    await publicFundProject.methods.contribute().send({
      value: "200",
      from: accounts[1],
    });
    const isContributor = await publicFundProject.methods
      .approvers(accounts[1])
      .call();
    assert(isContributor);
  });

  it("requires a minimum contribution", async () => {
    try {
      await publicFundProject.methods.contribute().send({
        value: "5",
        from: accounts[1],
      });
      assert(false);
    } catch (err) {
      assert(err);
    }
  });

  it("allows a manager to make a payment request", async () => {
    await publicFundProject.methods
      .createRequest("Buy batteries", "100", accounts[1])
      .send({
        from: accounts[0],
        gas: "1000000",
      });
    const request = await publicFundProject.methods.requests(0).call();

    assert.equal("Buy batteries", request.description);
  });

  it("processes requests", async () => {
    await publicFundProject.methods.contribute().send({
      from: accounts[0],
      value: web3.utils.toWei("10", "ether"),
    });

    await publicFundProject.methods
      .createRequest("A", web3.utils.toWei("5", "ether"), accounts[1])
      .send({ from: accounts[0], gas: "1000000" });

    await publicFundProject.methods.approveRequest(0).send({
      from: accounts[0],
      gas: "1000000",
    });

    await publicFundProject.methods.finalizeRequest(0).send({
      from: accounts[0],
      gas: "1000000",
    });

    let balance = await web3.eth.getBalance(accounts[1]);
    balance = web3.utils.fromWei(balance, "ether");
    balance = parseFloat(balance);
    assert(balance > 104);
  });
});
