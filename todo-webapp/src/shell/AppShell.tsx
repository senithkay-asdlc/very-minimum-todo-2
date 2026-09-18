import type { ReactElement } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import {
  AppShell as OxygenAppShell,
  Header,
  Sidebar,
  Footer,
  UserMenu,
  ColorSchemeToggle,
} from "@wso2/oxygen-ui";
import { ListChecks, LogOut } from "@wso2/oxygen-ui-icons-react";
import { useAuthz } from "../authz/gates";
import { signOut } from "../authz/session";
import { APP_NAME } from "../appName";
import { SCREEN_ROUTES } from "../authz/screens";

/**
 * The signed-in app shell — the wireframe's `navbar "Todo"` chrome, plus the
 * platform-prescribed navigation rail every Oxygen app carries. This app has
 * one screen, so the rail has one item.
 */
export function AppShell(): ReactElement {
  const { pathname } = useLocation();
  const { username } = useAuthz();
  const active = SCREEN_ROUTES.find((screen) => pathname.startsWith(screen.path))?.key;

  return (
    <OxygenAppShell>
      <OxygenAppShell.Navbar>
        <Header>
          <Header.Brand>
            <Header.BrandTitle>{APP_NAME}</Header.BrandTitle>
          </Header.Brand>
          <Header.Spacer />
          <Header.Actions>
            <ColorSchemeToggle />
            <UserMenu>
              <UserMenu.Trigger name={username || "Signed in"} showName />
              <UserMenu.Header name={username || "Signed in"} email="" />
              <UserMenu.Logout icon={<LogOut size={16} />} onClick={() => void signOut()} />
            </UserMenu>
          </Header.Actions>
        </Header>
      </OxygenAppShell.Navbar>

      <OxygenAppShell.Sidebar>
        <Sidebar activeItem={active}>
          <Sidebar.Nav>
            <Sidebar.Category>
              {SCREEN_ROUTES.map((screen) => (
                <Sidebar.Item key={screen.key} id={screen.key} link={<Link to={screen.path} />}>
                  <Sidebar.ItemIcon>
                    <ListChecks size={18} />
                  </Sidebar.ItemIcon>
                  <Sidebar.ItemLabel>{screen.label}</Sidebar.ItemLabel>
                </Sidebar.Item>
              ))}
            </Sidebar.Category>
          </Sidebar.Nav>
        </Sidebar>
      </OxygenAppShell.Sidebar>

      <OxygenAppShell.Main>
        <Outlet />
      </OxygenAppShell.Main>

      <OxygenAppShell.Footer>
        <Footer>
          <Footer.Copyright>© WSO2 LLC</Footer.Copyright>
        </Footer>
      </OxygenAppShell.Footer>
    </OxygenAppShell>
  );
}
