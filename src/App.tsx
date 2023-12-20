import { Actor, ActorSubclass, HttpAgent, Identity } from "@dfinity/agent";
import { AuthClient } from "@dfinity/auth-client";
import React, { useEffect, useState } from "react";
import { canisterId, idlFactory } from "./declarations/escrow_backend";
import { canisterId as iiCanId } from "./declarations/internet_identity";

const localhost = "http://localhost:3000";
const host = "https://icp0.io";
const network = process.env.DFX_NETWORK || "local";

const authClient = await AuthClient.create({
  idleOptions: {
    idleTimeout: 1000 * 60 * 30, // set to 30 minutes
    disableDefaultIdleCallback: true, // disable the default reload behavior
  },
});

const App = () => {
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [backendActor, setBackendActor] = useState<ActorSubclass | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const login = async () => {
    const days = BigInt(1);
    const hours = BigInt(24);
    const nanoseconds = BigInt(3600000000000);
    await authClient.login({
      identityProvider:
        network === "ic"
          ? "https://identity.ic0.app/#authorize"
          : `http://localhost:4943?canisterId=${iiCanId}`,
      maxTimeToLive: days * hours * nanoseconds,
      onSuccess: () => {
        setIsAuthenticated(true);
        checkAuth();
      },
      onError: (err) => alert(err),
    });
  };

  const checkAuth = async () => {
    if (await authClient.isAuthenticated()) {
      setIsAuthenticated(true);
      const _identity = authClient.getIdentity();
      setIdentity(_identity);

      let agent = new HttpAgent({
        host: network === "local" ? localhost : host,
        identity: _identity,
      });
      agent.fetchRootKey();

      const _backendActor = Actor.createActor(idlFactory, {
        agent,
        canisterId: canisterId,
      });
      setBackendActor(_backendActor);
    }
  };

  const logout = async () => {
    await authClient.logout();
    setIsAuthenticated(false);
  };

  useEffect(() => {
    checkAuth();
  }, []);

  console.log(backendActor)

  return (
    <div>
      <div className="p-5 my-5 flex justify-end">
        <button
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          onClick={isAuthenticated ? logout : login}
        >
          {isAuthenticated ? "Logout" : "Login"}
        </button>
      </div>
    </div>
  );
};

export default App;
