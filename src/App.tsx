import {useEffect, useRef, useState} from 'react'
import './App.css'
import {ethers} from 'ethers';
import {MintABI} from "./abi/mint.ts";
import {ERC20} from "./abi/erc20.ts";

function App() {
  const [nodeUrl, setNodeUrl] = useState('https://bsc-dataseed.bnbchain.org');
  const [tokenAddress, setTokenAddress] = useState('')
  const [privateKey, setPrivateKey] = useState('');
  const [logs, setLogs] = useState<any[]>([]);
  const isMintingRef = useRef(false);
  const [bnbBalance, setBnbBalance] = useState('0');
  const [tokenBalance, setTokenBalance] = useState('0');
  const lastBlockNumberRef = useRef(null);
  const logsEndRef = useRef<any>(null);
  const fetchBnbBalance = async (wallet:any) => {
    const balance = await wallet.provider.getBalance(wallet.address);
    setBnbBalance(ethers.formatEther(balance));
  };

  const fetchTokenBalance = async (wallet:any) => {
    const tokenContract = new ethers.Contract(tokenAddress, ERC20, wallet);
    //@ts-ignore
    const balance = await tokenContract.balanceOf(wallet.address);
    setTokenBalance(ethers.formatUnits(balance, 18));
  };

  const handleStart = async () => {
    if (!privateKey) {
      alert('Please enter your private key');
      return;
    }
    setLogs(prevLogs => [...prevLogs, 'Minting started']);

    isMintingRef.current = true;
    const provider = new ethers.JsonRpcProvider(nodeUrl);
    const wallet = new ethers.Wallet(privateKey, provider);
    const contractAddress = '0xd991C8DaC59c969CeFEB442d0e6cAe8E6c7f1f2a';
    const contract = new ethers.Contract(contractAddress, MintABI, wallet);
    executeMint(contract, wallet);
  };

  const executeMint = async (contract:any, wallet:any) => {
    if (!isMintingRef.current) return;
    try {
      const currentBlockNumber = await wallet.provider.getBlockNumber();

      if (lastBlockNumberRef.current === currentBlockNumber) {
        console.log('Skipping mint: same block number');
        setTimeout(() => {
          executeMint(contract, wallet);
        }, 500)
        return;
      }

      //@ts-ignore
      const tx = await contract.mint(tokenAddress, {value: ethers.parseEther('0.01')});
      const res = await tx.wait();
      setLogs(prevLogs => [...prevLogs, `Minted at block ${res.blockNumber}`]);

      lastBlockNumberRef.current = res.blockNumber;

      await fetchBnbBalance(wallet);
      await fetchTokenBalance(wallet);

      executeMint(contract, wallet);
    } catch (error) {
      console.log(error);
      setLogs(prevLogs => [...prevLogs, `Error: Mint failed`]);

      isMintingRef.current = false;
    }
  };

  useEffect(() => {
    if (privateKey) {
      const provider = new ethers.JsonRpcProvider(nodeUrl);
      const wallet = new ethers.Wallet(privateKey, provider);
      fetchBnbBalance(wallet);
    }

  }, [privateKey, nodeUrl])

  useEffect(() => {
    if (privateKey && tokenAddress) {
      const provider = new ethers.JsonRpcProvider(nodeUrl);
      const wallet = new ethers.Wallet(privateKey, provider);
      fetchTokenBalance(wallet);
    }
  }, [tokenAddress, privateKey,nodeUrl])

  const handleStop = () => {
    isMintingRef.current = false;
    setLogs(prevLogs => [...prevLogs, 'Minting stopped']);
  };

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({behavior: 'smooth'});
    }
  }, [logs]);

  return (
    <>
      <div className={"mint"}>
        <h1>Mint Tool</h1>
        <div className={"github"}>
          <a href={"https://github.com/MintTool/mint-tool"} target="_blank">Github: https://github.com/MintTool/mint-tool</a>
        </div>
        <div className={"field"}>
          <span>Node URL:</span>
          <input
            className={"input"}
            type="text"
            value={nodeUrl}
            onChange={(e) => setNodeUrl(e.target.value)}
          />
        </div>
        <div className={"field"}>
          <span>Private Key:</span>
          <input
            className={"input"}
            type="password"
            value={privateKey}
            onChange={(e) => setPrivateKey(e.target.value)}
          />
        </div>
        <div className={"field"}>
          <span>Token:</span>
          <input
            className={"input"}
            type="text"
            value={tokenAddress}
            onChange={(e) => setTokenAddress(e.target.value)}
          />
        </div>
        <div className={"item"}>
        <span>
          BNB Balance: {bnbBalance}
        </span>
          <span>
          Mint Amount: {tokenBalance}
        </span>
        </div>
        <div className={"button-box"}>
          <button onClick={handleStart} disabled={isMintingRef.current}>
            Start
          </button>
          <button onClick={handleStop} disabled={!isMintingRef.current}>
            Stop
          </button>
        </div>
      </div>

      <div className={"log"}>
        <h2>Logs</h2>
        {
          logs.length > 0 && <ul className={"ul"}>
          {logs.map((log, index) => (
              <li key={index}>{index + 1}: {log}</li>
            ))}
                <div ref={logsEndRef}></div>
            </ul>
        }

      </div>


    </>
  )
    ;
}

export default App
