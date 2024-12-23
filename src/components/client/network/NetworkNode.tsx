import { motion } from "framer-motion";
import { ChevronDown, ChevronRight, Users, Calendar, GraduationCap, Users2, UserPlus2, UserCheck, UserX } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { NetworkMember } from "./types";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface NetworkNodeProps {
  member: NetworkMember;
  depth?: number;
  onToggle: (nodeId: string) => void;
  expandedNodes: Set<string>;
}

export const NetworkNode = ({ member, depth = 0, onToggle, expandedNodes }: NetworkNodeProps) => {
  const hasChildren = member.children && member.children.length > 0;
  const isExpanded = expandedNodes.has(member.id);
  const isActive = member.user.status === 'active';
  
  // Placeholder image from Unsplash - using a professional looking photo
  const profileImage = "https://images.unsplash.com/photo-1649972904349-6e44c42644a7";

  // Format the registration date
  const formattedDate = member.user.registration_date 
    ? format(new Date(member.user.registration_date), "dd/MM/yyyy", { locale: ptBR })
    : "03/08/2015"; // Default date if none is provided

  // Calculate total network size recursively
  const calculateTotalTeamSize = (node: NetworkMember): number => {
    if (!node.children || node.children.length === 0) {
      return 0;
    }
    
    return node.children.reduce((total, child) => {
      return total + 1 + calculateTotalTeamSize(child);
    }, 0);
  };

  const totalTeamSize = calculateTotalTeamSize(member);

  const StatusIcon = isActive ? UserCheck : UserX;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="relative"
      style={{ 
        marginLeft: `${depth * 12}px`,
        width: `calc(100% - ${depth * 12}px)`
      }}
    >
      {depth > 0 && (
        <div 
          className="absolute left-[-12px] top-1/2 w-3 h-px bg-gray-300"
          style={{
            transform: "translateY(-50%)"
          }}
        />
      )}
      <Card className="p-4 bg-white shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-start gap-4">
          <div className="flex items-center gap-2">
            {hasChildren && (
              <button
                onClick={() => onToggle(member.id)}
                className="p-1 hover:bg-gray-100 rounded-full"
                aria-label={isExpanded ? "Recolher" : "Expandir"}
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-gray-500" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-gray-500" />
                )}
              </button>
            )}
            <div className="relative">
              <Avatar className={`h-12 w-12 border-2 ${isActive ? 'border-green-500' : 'border-red-500'}`}>
                <AvatarImage src={profileImage} alt={member.user.full_name || "Profile"} />
                <AvatarFallback>
                  <Users className="h-6 w-6" />
                </AvatarFallback>
              </Avatar>
              <StatusIcon 
                className={`absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-white p-0.5 ${
                  isActive ? 'text-green-500' : 'text-red-500'
                }`}
              />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-base font-semibold text-gray-900">
                {member.user.full_name || "Usuário"}
              </h3>
              {member.user.custom_id && (
                <span className="text-xs text-gray-500">
                  {member.user.custom_id}
                </span>
              )}
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}>
                {isActive ? 'Ativo' : 'Pendente'}
              </span>
            </div>
            
            <div className="space-y-1 text-sm">
              <div className="flex items-center gap-2 text-gray-600">
                <GraduationCap className="h-4 w-4" />
                <span>Graduação {member.user.graduation_type || "0"}</span>
              </div>
              
              <div className="flex items-center gap-2 text-gray-600">
                <Calendar className="h-4 w-4" />
                <span>{formattedDate}</span>
              </div>
              
              <div className="flex items-center gap-2 text-gray-600">
                <UserPlus2 className="h-4 w-4" />
                <span>Diretos: {member.children?.length || 0}</span>
              </div>
              
              <div className="flex items-center gap-2 text-gray-600">
                <Users2 className="h-4 w-4" />
                <span>Equipe: {totalTeamSize}</span>
              </div>
            </div>
          </div>
        </div>
      </Card>
      {hasChildren && isExpanded && (
        <div className="mt-2 space-y-2">
          {member.children.map((child) => (
            <NetworkNode
              key={child.id}
              member={child}
              depth={depth + 1}
              onToggle={onToggle}
              expandedNodes={expandedNodes}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
};