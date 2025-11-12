import React from "react";
import {toast} from "sonner";
import {LivingHive} from "@living-hive/react";
import type {BaseStory} from "@living-hive/react";

const sampleStories: BaseStory[] = [
  // Positive collaboration stories
  {
    id: "1",
    text: "I had a great experience working with my team today. We collaborated effectively and achieved our goals.",
  },
  {
    id: "2",
    text: "My colleagues were incredibly supportive when I was struggling with a difficult project. They offered help and shared resources.",
  },
  {
    id: "3",
    text: "We had an amazing brainstorming session where everyone contributed creative ideas. The team energy was fantastic.",
  },
  // Stress and workload stories
  {
    id: "4",
    text: "The project deadline was moved up unexpectedly, which caused some stress among team members.",
  },
  {
    id: "5",
    text: "I felt overwhelmed by the amount of work assigned this week, but my colleagues were supportive.",
  },
  {
    id: "6",
    text: "Working 60-hour weeks for the past month has been exhausting. I need better work-life balance.",
  },
  // Management and feedback stories
  {
    id: "7",
    text: "Our manager provided clear feedback during the performance review, which helped me understand areas for improvement.",
  },
  {
    id: "8",
    text: "My supervisor gave me vague instructions and then criticized my work when it wasn't what they wanted.",
  },
  {
    id: "9",
    text: "The manager never acknowledges our hard work, but is quick to point out mistakes. It's demotivating.",
  },
  // Communication issues
  {
    id: "10",
    text: "There was a miscommunication about the meeting time, leading to confusion and delays.",
  },
  {
    id: "11",
    text: "Important information is shared through email, Slack, and in-person meetings. It's hard to keep track of everything.",
  },
  {
    id: "12",
    text: "The team meeting was cancelled last minute without explanation. This happens frequently.",
  },
  // Technology and tools
  {
    id: "13",
    text: "The new software tool we implemented has significantly improved our workflow efficiency.",
  },
  {
    id: "14",
    text: "We encountered some technical issues with the server, but the IT team resolved them quickly.",
  },
  {
    id: "15",
    text: "The training session on the new system was very helpful and well-organized.",
  },
  {
    id: "16",
    text: "Our computers are outdated and slow, making it difficult to do our work efficiently.",
  },
  // Compensation and benefits
  {
    id: "17",
    text: "I haven't received a raise in two years despite taking on more responsibilities.",
  },
  {
    id: "18",
    text: "The health insurance benefits are excellent and cover all my family's needs.",
  },
  {
    id: "19",
    text: "Overtime pay is not being calculated correctly. I've worked extra hours that weren't compensated.",
  },
  // Workplace culture
  {
    id: "20",
    text: "The office culture is toxic. There's constant gossip and backstabbing among colleagues.",
  },
  {
    id: "21",
    text: "I love the flexible work schedule. Being able to work from home has improved my productivity.",
  },
  {
    id: "22",
    text: "There's no diversity in leadership positions. All managers are from the same background.",
  },
];

export function BasicExample() {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;

  if (!apiKey) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold mb-4">Basic Example</h2>
        <p className="text-gray-600 mb-4">
          Please set VITE_OPENAI_API_KEY in your .env.local file to see the
          visualization.
        </p>
        <p className="text-sm text-gray-500">
          Create a .env.local file in the root directory with:
          VITE_OPENAI_API_KEY=sk-your-key-here
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold mb-4">Basic Example</h2>
      <p className="text-gray-600 mb-4">
        This example shows the Living Hive visualization with auto-generated
        themes.
      </p>
      <LivingHive
        stories={sampleStories}
        openaiApiKey={apiKey}
        onError={(error) => {
          console.error("Error:", error);
          toast.error("Failed to process stories", {
            description: error.message,
            duration: 5000,
          });
        }}
      />
    </div>
  );
}
