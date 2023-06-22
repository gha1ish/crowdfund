const path = require("path");
const solc = require("solc");
const fs = require("fs-extra");

const buildPath = path.resolve(__dirname, "build");

//deleting pre-existing compiled files
fs.removeSync(buildPath);

const PublicFundProjectPath = path.resolve(
  __dirname,
  "contracts",
  "PublicFundProject.sol"
);
const source = fs.readFileSync(PublicFundProjectPath, "utf8");

const input = {
  language: "Solidity",
  sources: {
    "PublicFundProject.sol": {
      content: source,
    },
  },
  settings: {
    outputSelection: {
      "*": {
        "*": ["*"],
      },
    },
  },
};

const output = JSON.parse(solc.compile(JSON.stringify(input))).contracts[
  "PublicFundProject.sol"
];

//puting back our newly compiled files in build folder
fs.ensureDirSync(buildPath);

//looping for all the contracts available in PublicFundProject.sol
for (let contract in output) {
  fs.outputJsonSync(
    path.resolve(buildPath, contract.replace(":", "") + ".json"),
    output[contract]
  );
}
