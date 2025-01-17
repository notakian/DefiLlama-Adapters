const sdk = require("@defillama/sdk");
const { unwrapUniswapLPs } = require("../helper/unwrapLPs");
const { transformPolygonAddress } = require("../helper/portedTokens");
const abi = require("./abi.json");
const abiVaultChef = require("./abiVaultChef.json");
const abiStrat = require("./abiStrat.json");
const erc20 = require("../helper/abis/erc20.json");
const tvlOnPairs = require("../helper/processPairs.js");

const vaultChef = "0xBdA1f897E851c7EF22CD490D2Cf2DAce4645A904";
const masterChef = "0x4ce9Ae2f5983e19AebF5b8Bae4460f2B9EcE811a";
const FACTORY = "0x477ce834ae6b7ab003cce4bc4d8697763ff456fa";



const dexTvl = async (timestamp, ethBlock, chainBlocks) => {
  const balances = {};
  await tvlOnPairs("polygon", chainBlocks, FACTORY, balances);
  return balances;
};




const polygonTvl = async (timestamp, ethBlock, chainBlocks) => {
  const block = chainBlocks["polygon"];
  let balances = {};
/*
  // --- Check the masterchef poolLenght and all the bal from lp/underlyings ---
  const poolLength = (
    await sdk.api.abi.call({
      abi: abi.poolLength,
      target: masterChef,
      block,
      chain: "polygon",
    })
  ).output;

  const lpAddresses = [];

  for (let i = 0; i < poolLength; i++) {
    const poolInfo = (
      await sdk.api.abi.call({
        block,
        target: masterChef,
        params: i,
        abi: abi.poolInfo,
        chain: "polygon",
      })
    ).output;

    lpAddresses.push(poolInfo[0]);
  }

  const tokens0 = (
    await sdk.api.abi.multiCall({
      block,
      abi: {
        constant: true,
        inputs: [],
        name: "token0",
        outputs: [{ internalType: "address", name: "", type: "address" }],
        payable: false,
        stateMutability: "view",
        type: "function",
      },
      calls: lpAddresses.map((addr) => ({ target: addr })),
      chain: "polygon",
    })
  ).output.map((token) => token.output);

  const nonNull = tokens0
    .map((el, idx) => {
      if (el != null) return idx;
    })
    .filter((el) => el != null);

  const balOf = (
    await sdk.api.abi.multiCall({
      abi: erc20.balanceOf,
      calls: lpAddresses.map((lp) => ({
        target: lp,
        params: masterChef,
      })),
      chain: "polygon",
      block,
    })
  ).output.map((bal) => bal.output);

  let lpPositions = [];

  balOf.forEach((bal, idx) => {
    if (nonNull.includes(idx)) {
      lpPositions.push({
        balance: bal,
        token: lpAddresses[idx],
      });
    }
  });

  balOf.forEach((bal, idx) => {
    if (!nonNull.includes(idx)) {
      sdk.util.sumSingleBalance(balances, `polygon:${lpAddresses[idx]}`, bal);
    }
  });

  const transformAdress = await transformPolygonAddress();

  await unwrapUniswapLPs(
    balances,
    lpPositions,
    block,
    "polygon",
    transformAdress
  );
*/
  // --- Check the vaultChef poolLenght and all the bal from lp/underlyings ---
  const stratLength = (
    await sdk.api.abi.call({
      abi: abiVaultChef.poolLength,
      target: vaultChef,
      block,
      chain: "polygon",
    })
  ).output;

  const stratAddresses = [];

  for (let i = 0; i < stratLength; i++) {
    const stratInfo = (
      await sdk.api.abi.call({
        block,
        target: vaultChef,
        params: i,
        abi: abiVaultChef.poolInfo,
        chain: "polygon",
      })
    ).output;
    stratAddresses.push(stratInfo);
  }


  const sharesTotals = (
    await sdk.api.abi.multiCall({
      abi: abiStrat.sharesTotal,
      calls: stratAddresses.map((strat) => ({
        target: strat[1],
      })),
      chain: "polygon",
      block,
    })
  ).output.map((bal) => bal.output);

  const tokens0Strats = (
    await sdk.api.abi.multiCall({
      block,
      abi: {
        constant: true,
        inputs: [],
        name: "token0",
        outputs: [{ internalType: "address", name: "", type: "address" }],
        payable: false,
        stateMutability: "view",
        type: "function",
      },
      calls: stratAddresses.map((addr) => ({ target: addr[0] })),
      chain: "polygon",
    })
  ).output.map((token) => token.output);

  const nonNullStrat = tokens0Strats
    .map((el, idx) => {
      if (el != null) return idx;
    })
    .filter((el) => el != null);

  lpPositions = [];

  sharesTotals.forEach((sharesTotal, idx) => {
    if (nonNullStrat.includes(idx)) {
      lpPositions.push({
        balance: sharesTotal,
        token: stratAddresses[idx][0],
      });
    }
  });
  
  const transformAdressStrat = await transformPolygonAddress();

  await unwrapUniswapLPs(
    balances,
    lpPositions,
    block,
    "polygon",
    transformAdressStrat
  );

  sharesTotals.forEach((sharesTotal, idx) => {
    if (!nonNullStrat.includes(idx)) {
      console.log('Non zero:', stratAddresses[idx][0], sharesTotal);
      sdk.util.sumSingleBalance(
        balances,
        `polygon:${stratAddresses[idx][0]}`,
        sharesTotal
      );
    }
  });

  return balances;
};

module.exports = {
  methodology: "TVL counts liquidity in the AMM found using the factory address(0x477ce834ae6b7ab003cce4bc4d8697763ff456fa) and the TVL in the vaults that is tracked using the vaultChef contract(0xBdA1f897E851c7EF22CD490D2Cf2DAce4645A904).",
  tvl: sdk.util.sumChainTvls([polygonTvl, dexTvl]),
};