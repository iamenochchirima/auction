import { useEffect, useState } from "react";
import { useAuth } from "../components/Context";
import {
  Bid,
  BidRequest,
} from "../declarations/escrow_backend/escrow_backend.did";
import { toast } from "react-toastify";
import { Principal } from "@dfinity/principal";
import { canisterId } from "../declarations/escrow_backend";
import { QueryBlocksResponse } from "../declarations/ledger_canister/ledger_canister.did";
import { formatCountdown, formatDate } from "../utils";
import PlugConnect from "@psychedelic/plug-connect";

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
};

type CustomBid = {
  id: string;
  bidderPrincipal;
  bidder: string;
  amount: string;
  created: string;
  refunded: boolean;
};

let e8s = 100000000;

const Auction = () => {
  const {
    isAuthenticated,
    login,
    logout,
    backendActor,
    identity,
    LEDGER,
    ledgerArchive,
  } = useAuth();
  const [currentAuction, setCurrentAuction] = useState<Auction | null>(null);
  const [placingBid, setPlacingBid] = useState<boolean>(false);
  const [icpBalance, setIcpBalance] = useState<number>(0);
  const [canisterBal, setCanisterBal] = useState<number>(0);
  const [ledgerBlocks, setLedgerBlocks] = useState<QueryBlocksResponse | null>(
    null
  );
  const [auctionBids, setAuctionBids] = useState<CustomBid[] | null>(null);
  const [endTime, setEndTime] = useState<number>(0);
  const [countdown, setCountdown] = useState(formatCountdown(endTime));

  const [gettingBalances, setGettingBalances] = useState<boolean>(false);
  const [gettingAuction, setGettingAuction] = useState<boolean>(false);
  const [creatingAuction, setCreatingAuction] = useState<boolean>(false);
  const [AID, setAID] = useState<string>("");
  const [canisterAID, setCanisterAID] = useState<string>("");

  const [bidAmount, setBidAmount] = useState<number>(0);

  const toHexString = (byteArray: Uint8Array | number[]): string => {
    return Array.from(byteArray, (byte) => {
      return ("0" + (byte & 0xff).toString(16)).slice(-2);
    }).join("");
  };

  useEffect(() => {
    if (ledgerBlocks) {
      for (let block of ledgerBlocks.blocks) {
        // Check if parent_hash is a Uint8Array and has a length greater than 0
        if (
          block.parent_hash instanceof Uint8Array &&
          block.parent_hash.length > 0
        ) {
          // console.log(toHexString(block.parent_hash));
          // console.log(block);
        }
      }
    }
  }, [ledgerBlocks]);

  // useEffect(() => {
  //   if (ledgerArchive) {
  //    getArchiveBlocks();
  //   }
  // }, [ledgerArchive]);

  // const getArchiveBlocks = async () => {
  //   let blocks = await ledgerArchive.get_blocks({ start: 0, length: 10 });
  //   setLedgerBlocks(blocks);
  // };

  useEffect(() => {
    if (backendActor) {
      getCurrentAuction();
      getBalances();
    }
    if (LEDGER) {
      getLedgerBlocks();
      getAid();
    }
  }, [backendActor, LEDGER]);

  const getAid = async () => {
    let aid = await LEDGER.account_identifier({
      owner: identity?.getPrincipal(),
    });
    let canAID = await LEDGER.account_identifier({
      owner: Principal.fromText(canisterId),
    });
    setCanisterAID(toHexString(canAID));
    setAID(toHexString(aid));
  };

  useEffect(() => {
    if (currentAuction) {
      setEndTime(Number(currentAuction.endTime));
      getAuctionBids();
    }
  }, [currentAuction]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(formatCountdown(endTime));
    }, 1000);

    return () => clearInterval(interval);
  }, [endTime]);

  const getAuctionBids = async () => {
    let bids: Bid[] = await backendActor.getAuctionBids(currentAuction.id);
    let modififiedBids = bids.map((bid) => {
      return {
        ...bid,
        bidder: toHexString(bid.bidder),
        amount: (Number(bid.amount) / e8s).toFixed(2),
        created: formatDate(Number(bid.created)),
      };
    });
    setAuctionBids(modififiedBids);
  };

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
    setLedgerBlocks(blocks);
  };

  const handlePlaceBid = async () => {
    try {
      setPlacingBid(true);
      if (currentAuction.highestBid) {
        if (icpBalance < Number(currentAuction.highestBid.amount)) {
          toast.error(`You don't have enough ICP balance`, {
            autoClose: 5000,
            position: "top-center",
            hideProgressBar: true,
          });
          setPlacingBid(false);
          return;
        }
        if (bidAmount * e8s <= Number(currentAuction.highestBid.amount)) {
          console.log(
            "bidAmount",
            bidAmount,
            "highestBid",
            currentAuction.highestBid.amount
          );
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
        if (icpBalance < bidAmount * e8s) {
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
      {isAuthenticated && (
        <div className="">
          <h3 className="text-gray-800 font-cormorant"> Your Address: {AID}</h3>
          <h3 className="text-gray-800 font-cormorant">
            Your Principal: {identity?.getPrincipal().toString()}
          </h3>
          <hr />
          <h3 className="text-gray-800 font-cormorant mt-5">
            {" "}
            Canister Address: {canisterAID}
          </h3>
          <h3 className="text-gray-800 font-cormorant">
            Canister ID: {canisterId}
          </h3>
        </div>
      )}
      <div className="p-5 my-5 flex justify-between">
        {isAuthenticated && (
          <>
            {gettingBalances ? (
              <div>Getting balances...</div>
            ) : (
              <div className=" flex flex-col justify-start gap-5">
                <h1>Canister Balance: {Number(canisterBal) / e8s} ICP</h1>
                <h1>My Balance: {Number(icpBalance) / e8s} ICP</h1>
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
          {/* {!isAuthenticated ? (
            <PlugConnect
              whitelist={[
                "fh3gm-mqaaa-aaaal-qc54q-cai",
                "foynq-2yaaa-aaaal-qc55a-cai",
              ]}
              onConnectCallback={getPrincipal}
            />
          ) : (
            <button
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
              onClick={logout}
            >
              Logout
            </button>
          )} */}
          {!currentAuction && (
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
        {currentAuction ? (
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
                  {currentAuction?.highestBid
                    ? "Current Bid"
                    : "Bit starting at:"}
                </p>
                <p className="text-2xl font-bold">
                  {currentAuction?.highestBid
                    ? String(Number(currentAuction.highestBid.amount) / e8s)
                    : 1}{" "}
                  ICP
                </p>
                <p>Auction ends in: {countdown}</p>
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
      {currentAuction && (
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

      {/* Auction bids */}

      <div className="flex justify-center items-center gap-4 mt-5">
        {auctionBids && auctionBids.length > 0 ? (
          <div className="">
            <table className="text-left text-sm">
              <thead className="border-b font-medium dark:border-neutral-500">
                <tr>
                  <th scope="col" className="px-6 py-4">
                    Bidder Principal
                  </th>
                  <th scope="col" className="px-6 py-4">
                    Bidder address
                  </th>
                  <th scope="col" className="px-6 py-4">
                    Amount
                  </th>
                  <th scope="col" className="px-6 py-4">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody>
                {auctionBids.map((bid) => (
                  <tr key={bid.id} className="border-b">
                    <td className="px-6 py-4">
                      {bid.bidderPrincipal.slice(0, 20)}...
                    </td>
                    <td className="px-6 py-4">{bid.bidder.slice(0, 20)}...</td>
                    <td className="px-6 py-4">{bid.amount}</td>
                    <td className="px-6 py-4">{bid.created}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div>No bids yet</div>
        )}
      </div>
    </div>
  );
};

export default Auction;
