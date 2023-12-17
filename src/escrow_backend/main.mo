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

  let AuctionInterval = 20; // seconds
  let AuctionIntervalNanoseconds = 20_000_000_000;

  type Bid = Types.Bid;
  type Auction = Types.Auction;
  type BidRequest = Types.BidRequest;
  type BidId = Text;
  type AuctionId = Text;

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
    Debug.print("Action created");
  };

  ignore setTimer(
    #seconds(AuctionInterval),
    func() : async () {
      ignore recurringTimer(#seconds AuctionInterval, createAuction);
      await createAuction();
    },
  );

  public shared query func getAuction(id : Text) : async ?Auction {
    auctions.get(id);
  };

  public shared query func getOngoingAution() : async Result.Result<Auction, ()> {
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
      #err();
    };
  };

  public shared query func getAllAuctions() : async [Auction] {
    Iter.toArray(auctions.vals());
  };

  // Bid on an auction
  public shared func placeBid(args : BidRequest) : async Result.Result<(), Text> {
    let newBidId = Utils.generate_uuid();
    let currentTime = Time.now();
    let newBid : Bid = {
      id = newBidId;
      bidder = args.bidder;
      amount = args.amount;
      refunded = false;
      created = currentTime;
    };

    let auction = await getOngoingAution();

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
          case null {
            let updatedAuction : Auction = {
              auction with
              highestBid = ?newBid;
            };
            auctions.put(auction.id, updatedAuction);
            auctionBidsList := List.push(newBid, auctionBidsList);
            auctionBids.put(auction.id, auctionBidsList);
            bids.put(newBidId, newBid);
            #ok();
          };
          case (?highestBid) {
            if (args.amount > highestBid.amount) {
              let updatedAuction : Auction = {
                auction with
                highestBid = ?newBid;
              };
              auctions.put(auction.id, updatedAuction);
              auctionBidsList := List.push(newBid, auctionBidsList);
              auctionBids.put(auction.id, auctionBidsList);
              bids.put(newBidId, newBid);

              // refund previous highest bidder and update bid
              let updatedHighestBid : Bid = {
                highestBid with
                refunded = true;
              };
              bids.put(highestBid.id, updatedHighestBid);
              // TODO: refund previous highest bidder
              #ok();
            } else {
              #err("Bid amount is lower than current highest bid");
            };
          };
        };
      };
      case (#err()) {
        #err("No ongoing auction");
      };
    };
  };

  // Returns the default account identifier of this canister.
  func myAccountId() : Account.AccountIdentifier {
    Account.accountIdentifier(Principal.fromActor(Self), Account.defaultSubaccount());
  };

  // Returns canister's default account identifier as a blob.
  public query func canisterAccount() : async Account.AccountIdentifier {
    myAccountId();
  };

  // Returns current balance on the default account of this canister.
  // public func canisterBalance() : async Ledger.Tokens {
  //   await Ledger.account_balance({ account = Blob.toArray(myAccountId()) });
  // };

  // public func distributeRewards() : async ?Principal {
  //   let weekNanos = 7 * 24 * 3600 * 1_000_000_000;
  //   let now = Time.now();
  //   let threshold = if (now < weekNanos) { 0 } else { now - weekNanos };

  //   var maxPosts = 0;
  //   var mostProlificAuthor : ?Principal = null;

  //   // Go over all the posts and find the most prolific author.
  //   // for ((author, posts) in posts.entries()) {
  //   //   let numFreshPosts = List.foldLeft(posts, 0 : Nat, func (acc : Nat, post : Post) : Nat {
  //   //     if (post.created_at >= threshold) { acc + 1 } else { acc }
  //   //   });
  //   //   if (numFreshPosts > maxPosts) {
  //   //     maxPosts := numFreshPosts;
  //   //     mostProlificAuthor := ?author;
  //   //   };
  //   // };

  //   switch (mostProlificAuthor) {
  //     case null {};
  //     case (?principal) {
  //       // If there is a winner, transfer 1 Token to the winner.
  //       let res = await Ledger.transfer({
  //         memo = Nat64.fromNat(maxPosts);
  //         from_subaccount = null;
  //         to = Blob.toArray(Account.accountIdentifier(principal, Account.defaultSubaccount()));
  //         amount = { e8s = 100_000_000 };
  //         fee = { e8s = 10_000 };
  //         created_at_time = ?{ timestamp_nanos = Nat64.fromNat(Int.abs(now)) };
  //       });
  //       switch (res) {
  //         case (#Ok(blockIndex)) {
  //           Debug.print("Paid reward to " # debug_show principal # " in block " # debug_show blockIndex);
  //         };
  //         case (#Err(#InsufficientFunds { balance })) {
  //           throw Error.reject("Top me up! The balance is only " # debug_show balance # " e8s");
  //         };
  //         case (#Err(other)) {
  //           throw Error.reject("Unexpected error: " # debug_show other);
  //         };
  //       };
  //     };
  //   };

  //   mostProlificAuthor;
  // };

};
