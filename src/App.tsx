import { useEffect, useState } from "react";
import { useAuth } from "./components/Context";
import {
  Auction,
  Bid,
  BidRequest,
} from "./declarations/escrow_backend/escrow_backend.did";
import { toast } from "react-toastify";

interface Result {
  err?: any;
  ok?: any;
}

const App = () => {
  const { isAuthenticated, login, logout, backendActor } = useAuth();
  const [currrentAuction, setCurrentAuction] = useState<Auction | null>(null);
  const [placingBid, setPlacingBid] = useState<boolean>(false);
  const [icpBalance, setIcpBalance] = useState<number>(0);

  const [bidAmount, setBidAmount] = useState<number>(0);

  useEffect(() => {
    if (backendActor) {
      getCurrentAuction();
      getBalance();
    }
  }, [backendActor]);

  const getCurrentAuction = async () => {
    const auction: Result = await backendActor.getOngoingAuction();
    if (auction.ok) {
      setCurrentAuction(auction.ok);
    } else {
      console.log(auction.err);
    }
  };

  const handlePlaceBid = async () => {
    try {
      setPlacingBid(true);

      let bid: BidRequest = {
        amount: BigInt(bidAmount),
      };
      await backendActor.placeBid(bid);
      console.log(bid);
      setPlacingBid(false);
    } catch (error) {
      console.log(error);
      setPlacingBid(false);
    }
  };

  const getFreeICP = async () => {
    try {
      let res: Result = await backendActor.getFreeICP();
      if (res.ok) {
        console.log(res.ok);
      } else if (res.err) {
        console.log(res);
        toast.error(`${res.err}`, {
          autoClose: 5000,
          position: "top-center",
          hideProgressBar: true,
        });
      }
    } catch (error) {
      console.log(error);
    }
  };

  const getBalance = async () => {
    try {
      const res = await backendActor.getUserBalance();
     setIcpBalance(res.e8s);
    } catch (error) {
      console.log(error);
    }
  };

  console.log(icpBalance)

  return (
    <div>
      <div className="p-5 my-5 flex justify-between">
        {isAuthenticated && (
          <div className="">
            {icpBalance > 0 ? (
              <h1>ICP Balance: {Number(icpBalance)/10000000}</h1>
            ) : (
              <button
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                onClick={getFreeICP}
              >
                Get some icp
              </button>
            )}
          </div>
        )}
        <button
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          onClick={isAuthenticated ? logout : login}
        >
          {isAuthenticated ? "Logout" : "Login"}
        </button>
      </div>

      {/* Auction info */}
      <div className="flex justify-center items-center gap-4">
        <img src="./assets/nft.png" alt="nft" className="h-[150px] w-[150px" />
        <div className="">
          <h1 className="text-2xl font-bold">NFT on Auction</h1>
          <div className="text-gray-500">
            <p className="text-sm">
              {currrentAuction?.highestBid?.length > 0
                ? "Current Bid"
                : "Bit starting at:"}
            </p>
            <p className="text-2xl font-bold">
              {currrentAuction?.highestBid?.length > 0
                ? currrentAuction.highestBid[0].amount.toString()
                : 1}{" "}
              ICP ICP
            </p>
          </div>
        </div>
      </div>

      {/* Placing bid */}
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
    </div>
  );
};

export default App;
