import {
  AcademicCapIcon,
  BookOpenIcon,
  BuildingOffice2Icon,
  ChatBubbleLeftRightIcon,
  CloudIcon,
  ComputerDesktopIcon,
  DevicePhoneMobileIcon,
  EnvelopeIcon,
  FolderOpenIcon,
  GlobeAltIcon,
  KeyIcon,
  LifebuoyIcon,
  LockClosedIcon,
  PrinterIcon,
  ShieldCheckIcon,
  UsersIcon,
  WifiIcon,
  WrenchScrewdriverIcon,
} from "@heroicons/react/24/outline";

export const defaultTopicIcon = "book-open";

export const topicIcons = {
  "book-open": { label: "Open book", component: BookOpenIcon },
  "academic-cap": { label: "Graduation cap", component: AcademicCapIcon },
  "building-office": { label: "Campus building", component: BuildingOffice2Icon },
  "chat": { label: "Chat bubbles", component: ChatBubbleLeftRightIcon },
  "cloud": { label: "Cloud", component: CloudIcon },
  "computer-desktop": { label: "Computer", component: ComputerDesktopIcon },
  "device-phone-mobile": { label: "Mobile phone", component: DevicePhoneMobileIcon },
  "envelope": { label: "Envelope", component: EnvelopeIcon },
  "folder-open": { label: "Folder", component: FolderOpenIcon },
  "globe": { label: "Globe", component: GlobeAltIcon },
  "key": { label: "Key", component: KeyIcon },
  "lifebuoy": { label: "Life ring", component: LifebuoyIcon },
  "lock-closed": { label: "Lock", component: LockClosedIcon },
  "printer": { label: "Printer", component: PrinterIcon },
  "shield-check": { label: "Shield", component: ShieldCheckIcon },
  "users": { label: "People", component: UsersIcon },
  "wifi": { label: "Wi-Fi", component: WifiIcon },
  "wrench-screwdriver": { label: "Tools", component: WrenchScrewdriverIcon },
};

export type TopicIconName = keyof typeof topicIcons;

export const topicIconOptions = (Object.keys(topicIcons) as TopicIconName[]).map((id) => ({
  id,
  label: topicIcons[id].label,
}));

export function isTopicIcon(value: unknown): value is TopicIconName {
  return typeof value === "string" && Object.hasOwn(topicIcons, value);
}
