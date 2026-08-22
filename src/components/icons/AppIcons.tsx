// Shared set of line icons used across the app (dashboard tiles, sidebar nav, …) —
// same stroke style (round caps/joins, currentColor) as the rest of the app's inline SVGs.
import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function Icon({ children, ...rest }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      className="w-full h-full"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      viewBox="0 0 24 24"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const GridIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="3.5" y="3.5" width="7.5" height="7.5" rx="1.5" />
    <rect x="13" y="3.5" width="7.5" height="7.5" rx="1.5" />
    <rect x="3.5" y="13" width="7.5" height="7.5" rx="1.5" />
    <rect x="13" y="13" width="7.5" height="7.5" rx="1.5" />
  </Icon>
);

export const DocumentIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M7 3h7l4 4v14a1 1 0 01-1 1H7a1 1 0 01-1-1V4a1 1 0 011-1z" />
    <path d="M14 3v4h4" />
    <path d="M8.5 13h7M8.5 16.5h7M8.5 9.5h3" />
  </Icon>
);

export const QuestionCircleIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M9.6 9.3a2.4 2.4 0 114.15 1.65c-.7.7-1.75 1.05-1.75 2.25" />
    <path d="M12 17h.01" />
  </Icon>
);

export const ClipboardListIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="6" y="4" width="12" height="17" rx="1.5" />
    <path d="M9 4V3a1 1 0 011-1h4a1 1 0 011 1v1" />
    <path d="M9 10h6M9 13.5h6M9 17h4" />
  </Icon>
);

export const ReceiptIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M6 3h12v17l-2.5-1.5L13 20l-2.5-1.5L8 20l-2-1.5V3z" />
    <path d="M9 8h6M9 11.5h6" />
  </Icon>
);

export const WalletIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3 7a2 2 0 012-2h11a2 2 0 012 2v1" />
    <rect x="3" y="7" width="18" height="13" rx="2" />
    <path d="M16 13.5h2.5" />
  </Icon>
);

export const LockIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="5" y="11" width="14" height="9" rx="2" />
    <path d="M8 11V7a4 4 0 118 0v4" />
  </Icon>
);

export const UsersIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="9" cy="8.5" r="3" />
    <circle cx="17" cy="9.5" r="2.4" />
    <path d="M2.8 20c0-3.3 2.8-5.6 6.2-5.6s6.2 2.3 6.2 5.6" />
    <path d="M15.5 14.9c2.6.3 4.7 2.3 4.7 5.1" />
  </Icon>
);

export const FunnelIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 4h16l-6 8v6l-4 2v-8L4 4z" />
  </Icon>
);

export const BuildingIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="5" y="3" width="14" height="18" rx="1.5" />
    <path d="M9 8h1.5M13.5 8H15M9 12h1.5M13.5 12H15M9 16h1.5M13.5 16H15" />
  </Icon>
);

export const BanknotesIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="3" y="7" width="18" height="10" rx="1.5" />
    <circle cx="12" cy="12" r="2.2" />
    <path d="M6.5 9.5h.01M17.5 14.5h.01" />
  </Icon>
);

export const InboxDownIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 3v10m0 0l-4-4m4 4l4-4" />
    <path d="M4 15v4a2 2 0 002 2h12a2 2 0 002-2v-4" />
  </Icon>
);

export const RefreshIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M17.65 6.35A8 8 0 106.35 17.65" />
    <path d="M17 4v4h-4" />
  </Icon>
);

export const ChartBarIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 20V10M10 20V4M16 20v-7M3 20h18" />
  </Icon>
);

export const CoinsIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="9" cy="9" r="5" />
    <circle cx="15" cy="15" r="5" />
  </Icon>
);

export const CheckCircleIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M8.5 12.5l2.5 2.5 5-5" />
  </Icon>
);

export const ClockIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3.5 2" />
  </Icon>
);

export const HomeIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 11l8-7 8 7" />
    <path d="M6 10v9a1 1 0 001 1h4v-6h2v6h4a1 1 0 001-1v-9" />
  </Icon>
);

export const CameraIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="4" y="4" width="16" height="16" rx="5" />
    <circle cx="12" cy="12" r="3.5" />
    <circle cx="16.3" cy="7.7" r="0.6" fill="currentColor" stroke="none" />
  </Icon>
);

export const MusicNoteIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M9 18V5l9-2v11" />
    <circle cx="6" cy="18" r="3" />
    <circle cx="15" cy="16" r="3" />
  </Icon>
);

export const GlobeIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18" />
    <path d="M12 3a14 14 0 010 18" />
    <path d="M12 3a14 14 0 000 18" />
  </Icon>
);

export const LinkIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M8 12L5.5 14.5a3 3 0 004.24 4.24L12 16.5" />
    <path d="M16 12l2.5-2.5a3 3 0 00-4.24-4.24L12 7.5" />
    <path d="M9.5 14.5l5-5" />
  </Icon>
);

export const MapPinIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 21s-7-6.2-7-11a7 7 0 1114 0c0 4.8-7 11-7 11z" />
    <circle cx="12" cy="10" r="2.4" />
  </Icon>
);

export const ShoppingBagIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M6 8h12l-1 12H7L6 8z" />
    <path d="M9 8V6a3 3 0 016 0v2" />
  </Icon>
);

export const MegaphoneIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3 10v4a1 1 0 001 1h2l9 4V5l-9 4H4a1 1 0 00-1 1z" />
    <path d="M17 9.5a3 3 0 010 5" />
  </Icon>
);
