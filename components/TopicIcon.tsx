import { defaultTopicIcon, isTopicIcon, topicIcons } from "@/lib/topic-icons";

export default function TopicIcon({ icon, className }: { icon?: string | null; className?: string }) {
  const name = isTopicIcon(icon) ? icon : defaultTopicIcon;
  const Icon = topicIcons[name].component;

  return <Icon aria-hidden="true" className={className} data-topic-icon={name} />;
}
