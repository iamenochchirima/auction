import Account   "./utils/Account";

module {
     public type Bid = {
        id: Text;
        bidder: Account.AccountIdentifier;
        amount: Nat64;
        refunded: Bool;
        created: Int;
    };

    public type BidRequest = {
        amount: Nat64;
    };

    public type Balance = {
        e8s: Nat64;
    };

    public type Auction = {
        id: Text;
        item: Text;
        startTime: Int;
        endTime: Int;
        status: {
            #running;
            #ended;
        };
        highestBid: ?Bid;
    };
};