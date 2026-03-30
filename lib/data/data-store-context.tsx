import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useAuth } from "@/lib/auth-context";
import { LocalDataStore, LocalCatalogStore } from "./local-data-store";
import { RemoteDataStore, RemoteCatalogStore } from "./remote-data-store";
import type { DataStore, CatalogStore } from "./data-store.types";

// ─── Contexts ─────────────────────────────────────────────────────────────────

const DataStoreContext = createContext<DataStore | null>(null);
const CatalogStoreContext = createContext<CatalogStore | null>(null);

// Singletons for local stores (used when not signed in)
const localDataStore = new LocalDataStore();
const localCatalogStore = new LocalCatalogStore();

// ─── Provider ─────────────────────────────────────────────────────────────────

export function DataStoreProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();

  const dataStore = useMemo<DataStore>(() => {
    if (session?.user.id) {
      return new RemoteDataStore(session.user.id);
    }
    return localDataStore;
  }, [session?.user.id]);

  const catalogStore = useMemo<CatalogStore>(() => {
    if (session?.user.id) {
      return new RemoteCatalogStore();
    }
    return localCatalogStore;
  }, [session?.user.id]);

  return (
    <DataStoreContext.Provider value={dataStore}>
      <CatalogStoreContext.Provider value={catalogStore}>
        {children}
      </CatalogStoreContext.Provider>
    </DataStoreContext.Provider>
  );
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useDataStore(): DataStore {
  const store = useContext(DataStoreContext);
  if (!store) {
    throw new Error("useDataStore must be used within a DataStoreProvider");
  }
  return store;
}

export function useCatalogStore(): CatalogStore {
  const store = useContext(CatalogStoreContext);
  if (!store) {
    throw new Error("useCatalogStore must be used within a DataStoreProvider");
  }
  return store;
}
