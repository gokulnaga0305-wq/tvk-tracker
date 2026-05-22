'use client';
import { useState, useEffect } from 'react';
import { Member } from '@/lib/api';
import { Users, AlertTriangle, ExternalLink } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

function MemberCard({ member }: { member: Member }) {
  return (
    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4 hover:border-[#333] transition-colors flex gap-4">
      <div className="w-12 h-12 rounded-full bg-[#2a2a2a] flex items-center justify-center text-gray-500 shrink-0 overflow-hidden">
        {member.photo_url
          ? <img src={member.photo_url} alt={member.name} className="w-full h-full object-cover" />
          : <Users size={20} />
        }
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-white font-semibold text-sm">{member.name}</h3>
            <p className="text-gray-500 text-xs">{member.role}</p>
            {member.constituency && (
              <p className="text-gray-600 text-xs">{member.constituency}</p>
            )}
          </div>
          {(member.incident_count ?? 0) > 0 && (
            <span className="flex items-center gap-1 text-xs bg-red-950 text-red-400 border border-red-900 px-2 py-0.5 rounded shrink-0">
              <AlertTriangle size={10} />
              {member.incident_count} incident{member.incident_count !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <div className="flex gap-2 mt-2">
          <span className="text-[11px] bg-[#222] text-gray-500 px-2 py-0.5 rounded">{member.party}</span>
          {member.wiki_url && (
            <a href={member.wiki_url} target="_blank" rel="noopener noreferrer"
              className="text-[11px] text-orange-400 hover:text-orange-300 flex items-center gap-1">
              Wiki <ExternalLink size={9} />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/api/members/`)
      .then(r => r.json())
      .then(setMembers)
      .catch(() => setMembers([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex-1 p-3 sm:p-6 max-w-5xl mx-auto w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Users size={22} className="text-orange-400" />
          TVK Members
        </h1>
        <p className="text-gray-500 text-sm mt-1">Cabinet ministers and party MLAs with incident records</p>
      </div>

      {loading ? (
        <div className="text-gray-600 text-sm">Loading...</div>
      ) : members.length === 0 ? (
        <div className="text-center py-16 text-gray-600">
          <Users size={32} className="mx-auto mb-3 opacity-30" />
          <p>No members added yet. Run the seed SQL or add via admin panel.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {members.map(m => <MemberCard key={m.id} member={m} />)}
        </div>
      )}
    </div>
  );
}
