import { useNavigate } from "@tanstack/react-router";
import { PlusSquare, Image, Clapperboard, CircleDot, Type, CalendarDays, Ticket, Newspaper } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const PERSONAL = [
  { type: "post", label: "Create Post", icon: Image },
  { type: "reel", label: "Create Reel", icon: Clapperboard },
  { type: "story", label: "Create Story", icon: CircleDot },
  { type: "tweet", label: "Create Tweet", icon: Type },
] as const;
const BUSINESS = [
  { type: "event", label: "Create Event", icon: CalendarDays },
  { type: "ticket", label: "Create Ticket", icon: Ticket },
  { type: "news", label: "Publish News", icon: Newspaper },
] as const;

export function CreateMenu() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const options = profile?.account_type === "business" ? [...PERSONAL, ...BUSINESS] : PERSONAL;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild><Button size="sm"><PlusSquare className="h-4 w-4" />Create</Button></DropdownMenuTrigger>
      <DropdownMenuContent align="center" className="w-52">
        <DropdownMenuLabel>Create</DropdownMenuLabel>
        {options.map((option) => <DropdownMenuItem key={option.type} onSelect={() => navigate({ to: "/create", search: { type: option.type } })}><option.icon className="mr-2 h-4 w-4 text-primary" />{option.label}</DropdownMenuItem>)}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}