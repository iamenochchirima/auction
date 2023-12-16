import Account   "./utils/Account";

module {
     public type Bid = {
        bidder: Account.AccountIdentifier;
        amount: Nat64;
        created: Int;
    };

    public type Auction = {
        id: Text;
        item: Text;
        startTime: Int;
        endTime: Int;
        highestBid: ?Bid;
    };
};