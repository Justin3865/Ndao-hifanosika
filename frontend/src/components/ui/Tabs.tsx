"use client";

import {
  ReactNode,
  useState,
} from "react";

export interface TabItem {
  id: string;
  label: string;
  content: ReactNode;
  disabled?: boolean;
}

interface TabsProps {
  tabs: TabItem[];
  defaultTab?: string;
  activeTab?: string;
  onChange?: (tabId: string) => void;
  className?: string;
}

export function Tabs({
  tabs,
  defaultTab,
  activeTab,
  onChange,
  className = "",
}: TabsProps) {
  const firstAvailableTab =
    tabs.find((tab) => !tab.disabled)?.id ?? "";

  const [internalTab, setInternalTab] = useState(
    defaultTab || firstAvailableTab
  );

  const currentTab = activeTab ?? internalTab;

  function handleChange(tabId: string) {
    if (activeTab === undefined) {
      setInternalTab(tabId);
    }

    onChange?.(tabId);
  }

  const selectedTab = tabs.find(
    (tab) => tab.id === currentTab
  );

  return (
    <div className={`w-full ${className}`}>
      <div className="border-b border-gray-200">
        <div
          className="flex gap-1 overflow-x-auto"
          role="tablist"
        >
          {tabs.map((tab) => {
            const isActive = tab.id === currentTab;

            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                disabled={tab.disabled}
                onClick={() => handleChange(tab.id)}
                className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition
                  ${
                    isActive
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                  }
                  ${
                    tab.disabled
                      ? "cursor-not-allowed opacity-40"
                      : ""
                  }
                `}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="pt-5" role="tabpanel">
        {selectedTab?.content}
      </div>
    </div>
  );
}

export default Tabs;