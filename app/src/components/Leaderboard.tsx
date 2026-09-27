import { Button } from './Button';
import type { Group, Member } from '../model/types';
import './Leaderboard.css';

interface Props {
  group: Group;
  members: Member[];
  isHost: boolean;
  onInvite: () => void;
  onLeave: () => void;
  onManage: () => void;
}

/** Task screen "Group" card: the leaderboard for a shared task's group. */
export function Leaderboard({ group, members, isHost, onInvite, onLeave, onManage }: Props) {
  return (
    <div class="group-card">
      <div class="group-head">
        <h2>{group.name}</h2>
        <p>{group.members} of {group.memberLimit} members</p>
      </div>
      <div class="group-cols" aria-hidden="true">
        <span /><span>Streak</span><span>Month</span><span>Total</span>
      </div>
      <ol class="group-list">
        {members.map((m, i) => (
          <li key={m.userId} class={m.isMe ? 'me' : undefined}>
            <span class="gpos">{i + 1}</span>
            <span class="gname">
              {m.name}
              {m.isHost && <span class="gtag">host</span>}
            </span>
            <span class="gstat">{m.streak}</span>
            <span class="gstat">{m.month}</span>
            <span class="gstat">{m.total}</span>
          </li>
        ))}
      </ol>
      <div class="row">
        <Button onClick={onInvite}>Invite</Button>
        {isHost
          ? <Button onClick={onManage}>Manage members</Button>
          : <Button warn onClick={onLeave}>Leave</Button>}
      </div>
    </div>
  );
}
