import { useLocation, Link } from "react-router-dom";
import {
  Receipt,
  CreditCard,
  Package,
  Truck,
  User,
  Gear,
} from "@phosphor-icons/react";

const NavItem = ({ name, path, icon: Icon, activePaths, onClick }) => {
  const location = useLocation();
  const isActive = (activePaths ?? [path]).includes(location.pathname);
  return (
    <li>
      <Link
        to={path}
        onClick={onClick}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors duration-150
          ${
            isActive
              ? "bg-emerald-50 text-emerald-700 font-medium"
              : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"
          }`}
      >
        <Icon
          size={18}
          weight={isActive ? "duotone" : "regular"}
          className={isActive ? "text-emerald-600" : "text-gray-400"}
        />
        {name}
      </Link>
    </li>
  );
};

const Sidebar = (props) => {
  const { setCurrentStep } = props;

  const navGroups = [
    {
      label: "General",
      items: [
        {
          name: "Create Bill",
          path: "/create-bill",
          icon: Receipt,
          onClick: () => setCurrentStep?.(0),
        },
        { name: "Collect Payment", path: "/collect-payment", icon: CreditCard },
        { name: "Inventory", path: "/inventory", icon: Package },
        { name: "Stock Log", path: "/stock-log", icon: Truck },
      ],
    },
    {
      label: "Extra",
      items: [
        {
          name: "Users",
          path: "/Register-view",
          activePaths: ["/Register-view", "/Register-new"],
          icon: User,
        },
      ],
    },
  ];

  const bottomItems = [{ name: "Settings", path: "/settings", icon: Gear }];

  return (
    <aside className="flex flex-col w-60 h-screen bg-white border-r border-gray-100 shrink-0">
      <div className="flex flex-col items-center gap-2 px-4 py-6 border-b border-gray-100">
        <img
          src="./logo.png"
          alt="Liyonta Logo"
          className="h-27 w-27 object-contain"
        />
        <div className="text-center">
          <p className="text-sm font-semibold text-gray-800 leading-tight">
            Liyonta Tea
          </p>
          <p className="text-xs text-gray-400 mt-0.5">Point of Sale</p>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {navGroups.map((group) => (
          <div key={group.label}>
            <p className="px-3 mb-2 text-[10px] font-semibold tracking-widest text-gray-400 uppercase">
              {group.label}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => (
                <NavItem key={item.name} {...item} />
              ))}
            </ul>
          </div>
        ))}
      </nav>
      <div className="px-3 py-3 border-t border-gray-100">
        <ul>
          {bottomItems.map((item) => (
            <NavItem key={item.name} {...item} />
          ))}
        </ul>
      </div>
    </aside>
  );
};

export default Sidebar;
