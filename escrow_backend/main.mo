import Ledger "canister:ledger_canister";

import Debug "mo:base/Debug";
import Error "mo:base/Error";
import Int "mo:base/Int";
import HashMap "mo:base/HashMap";
import List "mo:base/List";
import Nat64 "mo:base/Nat64";
import Principal "mo:base/Principal";
import Time "mo:base/Time";
import Blob "mo:base/Blob";
import Text "mo:base/Text";

import now "mo:base/Time";
import { setTimer; recurringTimer } "mo:base/Timer";
import Array "mo:base/Array";
import Iter "mo:base/Iter";
import Result "mo:base/Result";

import Account "./utils/Account";
import Types "types";
import Utils "utils/utils";

actor Self {

  let AuctionInterval = 600; // seconds
  let AuctionIntervalNanoseconds = 600_000_000_000;
  let e8s : Nat64 = 100000000;
  let MintetAccount = "278b012b6396eac3f959e62c258d989aea98b5112aceb09fbbc83edc3138966f";

  type Bid = Types.Bid;
  type Auction = Types.Auction;
  type BidRequest = Types.BidRequest;
  type BidId = Text;
  type AuctionId = Text;
  type Balance = Types.Balance;

  var bids = HashMap.HashMap<BidId, Bid>(0, Text.equal, Text.hash);
  var auctions = HashMap.HashMap<AuctionId, Auction>(0, Text.equal, Text.hash);
  var auctionBids = HashMap.HashMap<AuctionId, List.List<Bid>>(0, Text.equal, Text.hash);

  private func createAuction() : async () {
    // get current ongoing auctions
    let ongoingAuctions = Array.filter<Auction>(
      Iter.toArray(auctions.vals()),
      func _auction = switch (_auction.status) {
        case (#running) {
          true;
        };
        case (#ended) {
          false;
        };
      },
    );
    // end all ongoing auctions
    for (auction in ongoingAuctions.vals()) {
      let updatedAuction : Auction = {
        auction with
        status = #ended;
      };
      auctions.put(auction.id, updatedAuction);
    };

    // create new auction
    let uuid = Utils.generate_uuid();
    let currentTime = Time.now();
    let auction : Auction = {
      id = uuid;
      item = "item";
      startTime = currentTime;
      endTime = currentTime + AuctionIntervalNanoseconds;
      status = #running;
      highestBid = null;
    };
    auctions.put(uuid, auction);
  };

  // TODO: uncomment this, only for testing
  // ignore setTimer(
  //   #seconds(AuctionInterval),
  //   func() : async () {
  //     ignore recurringTimer(#seconds AuctionInterval, createAuction);
  //     await createAuction();
  //   },
  // );
  // TODO: remove this, only for testing
  public shared func startAuction() : async () {
    await createAuction();
  };

  public shared query func getAuction(id : Text) : async ?Auction {
    auctions.get(id);
  };

  public shared query func getOngoingAuction() : async Result.Result<Auction, Text> {
    let currentTime = Time.now();
    let ongoingAuctions = Array.filter<Auction>(
      Iter.toArray(auctions.vals()),
      func _auction = switch (_auction.status) {
        case (#running) {
          if (_auction.endTime > currentTime) {
            true;
          } else {
            let updatedAuction : Auction = {
              _auction with
              status = #ended;
            };
            auctions.put(_auction.id, updatedAuction);
            false;
          };
        };
        case (#ended) {
          false;
        };
      },
    );
    if (ongoingAuctions.size() > 0) {
      #ok(ongoingAuctions[0]);
    } else {
      #err("No ongoing auction");
    };
  };

  public shared query func getAllAuctions() : async [Auction] {
    Iter.toArray(auctions.vals());
  };

  // Bid on an auction
  public shared ({ caller }) func placeBid(args : BidRequest) : async Result.Result<Text, Text> {
    let newBidId = Utils.generate_uuid();
    let bidder = userAID(caller);
    let currentTime = Time.now();
    let newBid : Bid = {
      id = newBidId;
      bidder = bidder;
      amount = args.amount * e8s;
      refunded = false;
      created = currentTime;
    };

    let auction = await getOngoingAuction();

    switch (auction) {
      case (#ok(auction)) {

        var auctionBidsList : List.List<Bid> = switch (auctionBids.get(auction.id)) {
          case null {
            List.nil();
          };
          case (?bids) {
            bids;
          };
        };

        switch (auction.highestBid) {
          case (null) {
            // // Transfer ICP to the canister account
            // let userBal = await Ledger.account_balance({
            //   account = Blob.toArray(bidder);
            // });

            // if (userBal.e8s < (args.amount * e8s)) {
            //   return #err("Not enough ICP to send");
            // } else {
            //   let result = await Ledger.transfer({
            //     to = Blob.toArray(myAccountId());
            //     fee = { e8s = 10_000 : Nat64 };
            //     memo = 0;
            //     from_subaccount = null;
            //     to_subaccount = null;
            //     created_at_time = null;
            //     amount = { e8s = args.amount * e8s };
            //   });
            //   switch (result) {
            //     case (#Ok(_)) {};
            //     case (#Err(err)) {
            //       return #err(transferError(err));
            //     };
            //   };
            // };

            // Update auction and bids
            let updatedAuction : Auction = {
              auction with
              highestBid = ?newBid;
            };
            auctions.put(auction.id, updatedAuction);
            auctionBidsList := List.push(newBid, auctionBidsList);
            auctionBids.put(auction.id, auctionBidsList);
            bids.put(newBidId, newBid);
            return #ok("Bid placed successfully");
          };
          case (?highestBid) {
            if ((args.amount * e8s) > highestBid.amount) {
              // Transfer ICP to the previous highest bidder account
              let transfereRes = await Ledger.transfer({
                to = Blob.toArray(highestBid.bidder);
                fee = { e8s = 10_000 : Nat64 };
                memo = 0;
                from_subaccount = null;
                to_subaccount = null;
                created_at_time = null;
                amount = { e8s = highestBid.amount };
              });
              switch (transfereRes) {
                case (#Ok(_)) {};
                case (#Err(err)) {
                  return #err(transferError(err));
                };
              };

              // Transfer ICP to the canister account
              // let userBal = await Ledger.account_balance({
              //   account = Blob.toArray(bidder);
              // });

              // if (userBal.e8s < (args.amount * e8s)) {
              //   return #err("Not enough ICP to send");
              // } else {
              //   let result = await Ledger.transfer({
              //     to = Blob.toArray(myAccountId());
              //     fee = { e8s = 10_000 : Nat64 };
              //     memo = 0;
              //     from_subaccount = null;
              //     to_subaccount = null;
              //     created_at_time = null;
              //     amount = { e8s = args.amount * e8s };
              //   });
              //   switch (result) {
              //     case (#Ok(_)) {};
              //     case (#Err(err)) {
              //       return #err(transferError(err));
              //     };
              //   };
              // };
            } else {
              return #err("Bid amount is lower than current highest bid");
            };

            // Update auction and bids
            let updatedAuction : Auction = {
              auction with
              highestBid = ?newBid;
            };
            auctions.put(auction.id, updatedAuction);
            auctionBidsList := List.push(newBid, auctionBidsList);
            auctionBids.put(auction.id, auctionBidsList);
            bids.put(newBidId, newBid);

            let updatedHighestBid : Bid = {
              highestBid with
              refunded = true;
            };
            bids.put(highestBid.id, updatedHighestBid);
            return #ok("Bid placed successfully");
          };
        };
      };
      case (#err(msg)) {
        #err("No ongoing auction");
      };
    };
  };

  func transferError(err : Ledger.TransferError) : Text {
    switch (err) {
      case (#BadFee(msg)) {
        "Bad fee: " # Nat64.toText(msg.expected_fee.e8s);
      };
      case (#InsufficientFunds(msg)) {
        "Insufficient funds: " # Nat64.toText(msg.balance.e8s);
      };
      case (#TxCreatedInFuture(msg)) {
        "Tx created in future: ";
      };
      case (#TxDuplicate(msg)) {
        "Tx Duplicate: " # Nat64.toText(msg.duplicate_of);
      };
      case (#TxTooOld(msg)) {
        "Tx expired: " # Nat64.toText(msg.allowed_window_nanos);
      };
    };
  };

  public shared ({ caller }) func getUserBalance() : async Balance {
    let callerAID = userAID(caller);
    let callerBalance = await Ledger.account_balance({
      account = Blob.toArray((callerAID));
    });
    callerBalance;
  };

  public shared func getCanisterBalance() : async Balance {
    let canisterBalance = await Ledger.account_balance({
      account = Blob.toArray(myAccountId());
    });
    canisterBalance;
  };

  // Returns the default account identifier of this canister.
  func myAccountId() : Account.AccountIdentifier {
    Account.accountIdentifier(Principal.fromActor(Self), Account.defaultSubaccount());
  };

  func userAID(id : Principal) : Account.AccountIdentifier {
    Account.accountIdentifier(id, Account.defaultSubaccount());
  };

  // Returns canister's default account identifier as a blob.
  public query func canisterAccount() : async Account.AccountIdentifier {
    myAccountId();
  };

};
