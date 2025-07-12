import { createContext, ReactNode, useContext } from "react";

interface ContextProviderProps {
    children: ReactNode;
}

type Hook<T extends object, R> = (props: T) => R;

/**
 * Creates a context provider and a custom hook for accessing the context.
 * restriction: The hook must have a single argument that is an object of type T.
 * @param hook - A hook that takes props of type T and returns a value of type R.
 * @returns A tuple containing a ContextProvider component and a useContext hook.
 */
export default function contextualize<T extends object, R>(hook: Hook<T, R>) {
    const Context = createContext<R | undefined>(undefined);
    const ContextProvider = ({ children, ...rest }: T & ContextProviderProps) => {
        const value = hook(rest as T);
        return (
            <Context.Provider value={value}>
                {children}
            </Context.Provider>
        );
    }

    Context.displayName = `ContextProvider(${hook.name || "Anonymous"})`;

    const useValue = () => {
        const contextValue = useContext(Context)
        if (contextValue === undefined) {
            throw new Error("useValue must be used within a ContextProvider");
        }
        return contextValue;
    };

    return [ContextProvider, useValue] as const;
}
