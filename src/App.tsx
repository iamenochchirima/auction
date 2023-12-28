import { useEffect, useState } from "react";
import { useAuth } from "./components/Context";
import {
  Bid,
  BidRequest,
} from "./declarations/escrow_backend/escrow_backend.did";
import { toast } from "react-toastify";
import { Principal } from "@dfinity/principal";
import { canisterId } from "./declarations/escrow_backend";

interface Result {
  err?: null;
  ok?: null;
}

type Auction = {
  endTime: bigint;
  highestBid: undefined | Bid;
  id: string;
  item: string;
  startTime: bigint;
  status: { ended: null } | { running: null };
}

let e8s = 100000000;

const App = () => {
  const { isAuthenticated, login, logout, backendActor, identity, LEDGER } =
    useAuth();
  const [currrentAuction, setCurrentAuction] = useState<Auction | null>(null);
  const [placingBid, setPlacingBid] = useState<boolean>(false);
  const [icpBalance, setIcpBalance] = useState<number>(0);
  const [canisterBal, setCanisterBal] = useState<number>(0);
  const [ledgerBlock, setLedgerBlock] = useState<any[] | null>(null);

  const [gettingBalances, setGettingBalances] = useState<boolean>(false);
  const [gettingAuction, setGettingAuction] = useState<boolean>(false);
  const [creatingAuction, setCreatingAuction] = useState<boolean>(false);

  const [bidAmount, setBidAmount] = useState<number>(0);

  console.log(icpBalance)

  useEffect(() => {
    if (backendActor) {
      getCurrentAuction();
      getBalances();
    }
    if (LEDGER) {
      getLedgerBlocks();
    }
  }, [backendActor, LEDGER]);

  const getCurrentAuction = async () => {
    setGettingAuction(true);
    const _auction: Result = await backendActor.getOngoingAuction();
    if (_auction.ok) {
      setCurrentAuction(_auction.ok);
      setGettingAuction(false);
    } else if (_auction.err) {
      setGettingAuction(false);
      toast;
    }
  };

  const getLedgerBlocks = async () => {
    let blocks = await LEDGER.query_blocks({ start: 0, length: 10 });
    setLedgerBlock(blocks);
  };

  const handlePlaceBid = async () => {
    try {
      setPlacingBid(true);

      if (currrentAuction.highestBid) {
        if (icpBalance < Number(currrentAuction.highestBid.amount)) {
          toast.error(`You don't have enough ICP balance`, {
            autoClose: 5000,
            position: "top-center",
            hideProgressBar: true,
          });
          setPlacingBid(false);
          return;
        } else if ((bidAmount * e8s) < Number(currrentAuction.highestBid.amount)) {
          console.log("bidAmount", bidAmount, "highestBid", currrentAuction.highestBid.amount);
          toast.error(`Bid amount should be higher than current bid`, {
            autoClose: 5000,
            position: "top-center",
            hideProgressBar: true,
          });
          setPlacingBid(false);
          return;
        } 
        let canisterAID = await LEDGER.account_identifier({
          owner: Principal.fromText(canisterId),
        });
        let result = await LEDGER.transfer({
          to: canisterAID,
          fee: { e8s: 10_000 },
          memo: 0,
          from_subaccount: null,
          to_subaccount: null,
          created_at_time: null,
          amount: { e8s: bidAmount * e8s },
        });

        console.log("Send results", result);
        let bid: BidRequest = {
          amount: BigInt(bidAmount),
        };
        let res: Result = await backendActor.placeBid(bid);
        if (res.err) {
          toast.error(`${res.err}`, {
            autoClose: 5000,
            position: "top-center",
            hideProgressBar: true,
          });
          setPlacingBid(false);
        } else if (res.ok) {
          toast.success(`Bid placed successfully`, {
            autoClose: 5000,
            position: "top-center",
            hideProgressBar: true,
          });
        }
        getBalances();
        getCurrentAuction();
        setPlacingBid(false);
      } else {
        if (icpBalance < (bidAmount * e8s)) {
          toast.error(`You don't have enough ICP balance`, {
            autoClose: 5000,
            position: "top-center",
            hideProgressBar: true,
          });
          setPlacingBid(false);
          return;
        }
        let canisterAID = await LEDGER.account_identifier({
          owner: Principal.fromText(canisterId),
        });
        let result = await LEDGER.transfer({
          to: canisterAID,
          fee: { e8s: 10_000 },
          memo: 0,
          from_subaccount: null,
          to_subaccount: null,
          created_at_time: null,
          amount: { e8s: bidAmount * e8s },
        });

        console.log("Send results", result);
        let bid: BidRequest = {
          amount: BigInt(bidAmount),
        };
        let res: Result = await backendActor.placeBid(bid);
        if (res.err) {
          toast.error(`${res.err}`, {
            autoClose: 5000,
            position: "top-center",
            hideProgressBar: true,
          });
          setPlacingBid(false);
        } else if (res.ok) {
          toast.success(`Bid placed successfully`, {
            autoClose: 5000,
            position: "top-center",
            hideProgressBar: true,
          });
        }
        getBalances();
        getCurrentAuction();
        setPlacingBid(false);
      }

      let bid: BidRequest = {
        amount: BigInt(bidAmount),
      };
      console.log("bid", bid)
      let res: Result = await backendActor.placeBid(bid);
      if (res.err) {
        toast.error(`${res.err}`, {
          autoClose: 5000,
          position: "top-center",
          hideProgressBar: true,
        });
        setPlacingBid(false);
      } else if (res.ok) {
        toast.success(`Bid placed successfully`, {
          autoClose: 5000,
          position: "top-center",
          hideProgressBar: true,
        });
      }
      getBalances();
      getCurrentAuction();
      setPlacingBid(false);
    } catch (error) {
      console.log(error);
      toast.error(`${error}`, {
        autoClose: 5000,
        position: "top-center",
        hideProgressBar: true,
      });
      setPlacingBid(false);
    }
  };

  const createAuction = async () => {
    setCreatingAuction(true);
    await backendActor.startAuction();
    await getCurrentAuction();
    setCreatingAuction(false);
  };

  const getBalances = async () => {
    try {
      setGettingBalances(true);
      const userBal = await backendActor.getUserBalance();
      const canBal = await backendActor.getCanisterBalance();
      setCanisterBal(canBal.e8s);
      setIcpBalance(userBal.e8s);
      setGettingBalances(false);
    } catch (error) {
      console.log(error);
      setGettingBalances(false);
    }
  };

  return (
    <div>
      <div className="p-5 my-5 flex justify-between">
        {isAuthenticated && (
          <>
            {gettingBalances ? (
              <div>Getting balances...</div>
            ) : (
              <div className=" flex flex-col justify-start gap-5">
                <h1>Canister Balance: {Number(canisterBal) / e8s}</h1>
                <h1>My Balance: {Number(icpBalance) / e8s}</h1>
              </div>
            )}
          </>
        )}
        <div className="flex items-center gap-3">
          <button
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            onClick={isAuthenticated ? logout : login}
          >
            {isAuthenticated ? "Logout" : "Login"}
          </button>
          {!currrentAuction && (
            <button
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
              onClick={createAuction}
            >
              {creatingAuction ? "Creating auction..." : "Create auction"}
            </button>
          )}
        </div>
      </div>

      {/* Auction info */}
      <div className="flex justify-center items-center gap-4">
        {currrentAuction ? (
          <>
            <img
              src="./assets/nft.png"
              alt="nft"
              className="h-[150px] w-[150px"
            />
            <div className="">
              <h1 className="text-2xl font-bold">NFT on Auction</h1>
              <div className="text-gray-500">
                <p className="text-sm">
                  {currrentAuction?.highestBid
                    ? "Current Bid"
                    : "Bit starting at:"}
                </p>
                <p className="text-2xl font-bold">
                  {currrentAuction?.highestBid
                    ? String(Number(currrentAuction.highestBid.amount) / e8s)
                    : 1}{" "}
                  ICP
                </p>
              </div>
            </div>
          </>
        ) : (
          <div>
            {gettingAuction ? (
              <div>Getting auction...</div>
            ) : (
              <div>There is no auction currently running</div>
            )}
          </div>
        )}
      </div>

      {/* Placing bid */}
      {currrentAuction && (
        <div className="flex justify-center items-center gap-4 mt-5">
          <input
            type="number"
            value={bidAmount}
            onChange={(e) => setBidAmount(parseInt(e.target.value))}
            className="border border-gray-300 rounded-md p-2 w-[150px]"
            placeholder="Enter amount"
          />
          <button
            onClick={handlePlaceBid}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            {placingBid ? "Placing bid..." : "Place bid"}
          </button>
        </div>
      )}
    </div>
  );
};

export default App;
