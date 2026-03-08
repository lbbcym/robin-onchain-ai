import { Command } from 'commander';
import { ethers } from 'ethers';

const program = new Command();
const PACT_REGISTRY = "0xe0Aa68A65520fd8c300E42abfAF96467e5C3ABEA";
const RPC_URL = "https://mainnet.base.org";

program
  .name('robin-pact')
  .description('Robin Agent Service Node for PACT');

program.command('listen-for-tasks')
  .description('Robust Polling for TaskCreated events on Base')
  .action(async () => {
    console.log(`[NETWORK] Connecting to Base Mainnet (Stateless Polling Mode)...`);
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    
    const abi = ["event TaskCreated(uint256 indexed taskId, string taskUrl, uint256 bounty)"];
    const contract = new ethers.Contract(PACT_REGISTRY, abi, provider);

    console.log(`[SENTRY] Robin is now watching PACT Registry at ${PACT_REGISTRY}`);
    
    let lastBlock = await provider.getBlockNumber();
    console.log(`[INIT] Starting from block: ${lastBlock}`);

    // 每 15 秒主动检查一次新块，不依赖服务器 Filter
    setInterval(async () => {
        try {
            const currentBlock = await provider.getBlockNumber();
            if (currentBlock <= lastBlock) return;

            console.log(`[SCAN] Checking blocks ${lastBlock + 1} to ${currentBlock}...`);
            const events = await contract.queryFilter("TaskCreated", lastBlock + 1, currentBlock);
            
            for (const event of events) {
                // Ethers v6 语法
                const [taskId, taskUrl, bounty] = (event as any).args;
                const reward = ethers.formatUnits(bounty, 6);
                console.log(`\n!!! NEW TASK DETECTED !!!`);
                console.log(`ID: ${taskId} | Reward: ${reward} USDC | URL: ${taskUrl}`);
                console.log(`[ACTION] Audit logic would trigger for: ${taskUrl}`);
            }
            
            lastBlock = currentBlock;
        } catch (e) {
            console.error("[RPC_ERROR] Network jitter, retrying in 15s...");
        }
    }, 15000);
  });

program.parse();
