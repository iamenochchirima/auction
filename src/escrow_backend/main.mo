import Ledger    "canister:icp_ledger_canister";

import Debug     "mo:base/Debug";
import Error     "mo:base/Error";
import Int       "mo:base/Int";
import HashMap   "mo:base/HashMap";
import List      "mo:base/List";
import Nat64     "mo:base/Nat64";
import Principal "mo:base/Principal";
import Time      "mo:base/Time";
import Blob "mo:base/Blob";

import Account   "./Account";

actor Self {
  
  // Returns the default account identifier of this canister.
  func myAccountId() : Account.AccountIdentifier {
    Account.accountIdentifier(Principal.fromActor(Self), Account.defaultSubaccount())
  };

    // Returns canister's default account identifier as a blob.
  public query func canisterAccount() : async Account.AccountIdentifier {
    myAccountId()
  };

   // Returns current balance on the default account of this canister.
  public func canisterBalance() : async Ledger.Tokens {
    await Ledger.account_balance({ account = Blob.toArray(myAccountId()) })
  };

  public func distributeRewards() : async ?Principal {
    let weekNanos = 7 * 24 * 3600 * 1_000_000_000;
    let now = Time.now();
    let threshold = if (now < weekNanos) { 0 } else { now - weekNanos };

    var maxPosts = 0;
    var mostProlificAuthor : ?Principal = null;

    // Go over all the posts and find the most prolific author.
    // for ((author, posts) in posts.entries()) {
    //   let numFreshPosts = List.foldLeft(posts, 0 : Nat, func (acc : Nat, post : Post) : Nat {
    //     if (post.created_at >= threshold) { acc + 1 } else { acc }
    //   });
    //   if (numFreshPosts > maxPosts) {
    //     maxPosts := numFreshPosts;
    //     mostProlificAuthor := ?author;
    //   };
    // };
    
    switch (mostProlificAuthor) {
      case null {};
      case (?principal) {
        // If there is a winner, transfer 1 Token to the winner.
        let res = await Ledger.transfer({
          memo = Nat64.fromNat(maxPosts);
          from_subaccount = null;
          to = Blob.toArray(Account.accountIdentifier(principal, Account.defaultSubaccount()));
          amount = { e8s = 100_000_000 };
          fee = { e8s = 10_000 };
          created_at_time = ?{ timestamp_nanos = Nat64.fromNat(Int.abs(now)) };
        });
        switch (res) {
          case (#Ok(blockIndex)) {
            Debug.print("Paid reward to " # debug_show principal # " in block " # debug_show blockIndex);
          };
          case (#Err(#InsufficientFunds { balance })) {
            throw Error.reject("Top me up! The balance is only " # debug_show balance # " e8s");
          };
          case (#Err(other)) {
            throw Error.reject("Unexpected error: " # debug_show other);
          };
        };
      };
    };

    mostProlificAuthor
  };


};
