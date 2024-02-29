import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  FC,
} from "react";
import {
  AuthClientCreateOptions,
  AuthClientLoginOptions,
} from "@dfinity/auth-client";
import { canisterId as iiCanId } from "../declarations/internet_identity";
import { _SERVICE as TOKENSERVICE } from "../declarations/hodl_nft/hodl_nft.did";
import { tokenIDL } from "./factory";
import { Actor, ActorSubclass, HttpAgent } from "@dfinity/agent";

interface AuthContextType {
  nftActor: ActorSubclass<TOKENSERVICE> | null;
}

const AuthContext = createContext<AuthContextType | null>(null);

const network = process.env.DFX_NETWORK || "local";
const localhost = "http://localhost:4943";
const host = "https://icp0.io";

interface DefaultOptions {
  createOptions: AuthClientCreateOptions;
  loginOptions: AuthClientLoginOptions;
}

const defaultOptions: DefaultOptions = {
  createOptions: {
    idleOptions: {
      disableIdle: true,
    },
  },
  loginOptions: {
    identityProvider:
      network === "ic"
        ? "https://identity.ic0.app/#authorize"
        : `http://localhost:4943?canisterId=${iiCanId}`,
  },
};

export const useAuthClient = (options = defaultOptions) => {
 

  const [nftActor, setNftActor] = useState<ActorSubclass<TOKENSERVICE> | null>(
    null
  );


  useEffect(() => {

      updateClient();
  
  }, []);

  async function updateClient() {
    

    let agent = new HttpAgent({
      host: network === "ic" ? host : localhost,
    });

    if (network !== "ic") {
      agent.fetchRootKey();
    }

    const _nftActor: ActorSubclass<TOKENSERVICE> = Actor.createActor(tokenIDL, {
      agent,
      canisterId: "br5f7-7uaaa-aaaaa-qaaca-cai",
    });
    setNftActor(_nftActor);

  }

  return {
    nftActor,
 
  };
};

interface LayoutProps {
  children: React.ReactNode;
}

export const AuthProvider: FC<LayoutProps> = ({ children }) => {
  const auth = useAuthClient();

  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
