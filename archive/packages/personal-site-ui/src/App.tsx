import * as React from "react";
import { Suspense } from "react";
import { BrowserRouter, Route, Switch } from "react-router-dom";
import { routes } from "./routes";
import { Header } from "./components/Header";

export function App() {
  return (
    <div>
      <Header />
      <Suspense fallback={"loading..."}>
        <div id="app-content">
          <BrowserRouter>
            <Switch>
              {routes.map((routeProps) => (
                <Route
                  {...routeProps}
                  key={
                    Array.isArray(routeProps.path)
                      ? routeProps.path.join("/")
                      : routeProps.path
                  }
                />
              ))}
            </Switch>
          </BrowserRouter>
        </div>
      </Suspense>
    </div>
  );
}
