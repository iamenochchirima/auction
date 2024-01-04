import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  FC,
} from "react";
import {
  AuthClient,
  AuthClientCreateOptions,
  AuthClientLoginOptions,
} from "@dfinity/auth-client";
import { canisterId as iiCanId } from "../declarations/internet_identity";
import { canisterId, createActor } from "../declarations/escrow_backend";
// @ts-ignore
import icblast from "@infu/icblast";

interface AuthContextType {
  isAuthenticated: boolean;
  login: () => void;
  logout: () => void;
  authClient: AuthClient | null;
  identity: any;
  principal: any;
  backendActor: any;
  LEDGER: any;
  ledgerArchive : any;
}

const AuthContext = createContext<AuthContextType | null>(null);

const network = process.env.DFX_NETWORK || "local";

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
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [authClient, setAuthClient] = useState<AuthClient | null>(null);
  const [identity, setIdentity] = useState<any>(null);
  const [principal, setPrincipal] = useState<any>(null);
  const [backendActor, setBackendActor] = useState<any>(null);
  const [LEDGER, setLEDGER] = useState<any>(null);
  const [ledgerArchive, setLedgerArchive] = useState<any>(null);

  useEffect(() => {
    AuthClient.create(options.createOptions).then(async (client) => {
      updateClient(client);
    });
  }, []);

  const login = () => {
    authClient?.login({
      ...options.loginOptions,
      onSuccess: () => {
        updateClient(authClient);
      },
    });
  };

  async function updateClient(client: AuthClient) {
    const isAuthenticated = await client.isAuthenticated();
    setIsAuthenticated(isAuthenticated);

    const identity = client.getIdentity();
    setIdentity(identity);

    const principal = identity.getPrincipal();
    setPrincipal(principal);

    setAuthClient(client);

    let ic = icblast({ identity: identity, local: network === "local" ? true : false });

    let _backendcan = await ic(canisterId);

    let ledgerCan = await ic("ryjl3-tyaaa-aaaaa-aaaba-cai");
    setBackendActor(_backendcan);
    setLEDGER(ledgerCan);

    let ledgerArchive = await ic("qjdve-lqaaa-aaaaa-aaaeq-cai");
    setLedgerArchive(ledgerArchive);
  }

  async function logout() {
    await authClient?.logout();
    await updateClient(authClient);
  }

  return {
    isAuthenticated,
    login,
    logout,
    authClient,
    identity,
    principal,
    backendActor,
    LEDGER,
    ledgerArchive
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
