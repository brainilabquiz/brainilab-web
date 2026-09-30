/* Groups page presentation. Membership and score operations remain in BrainiSocial. */
window.BrainiGroupsView=(()=>{
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const number=value=>Math.max(0,Number(value)||0).toLocaleString('en-GB');
  const icons={people:'<circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2m2-15a3 3 0 0 1 0 6m1 3a5 5 0 0 1 3 5v1"/>',invite:'<path d="M14 4h6v6m0-6L10 14M10 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-5"/>',plus:'<path d="M12 5v14M5 12h14"/>',trophy:'<path d="M8 3h8v7a4 4 0 0 1-8 0V3Zm0 2H4v3a4 4 0 0 0 4 4m8-7h4v3a4 4 0 0 1-4 4m-4 2v5m-4 2h8"/>'};
  const icon=name=>`<svg class="group-ui-icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${icons[name]||icons.people}</svg>`;
  const crest=g=>BrainiIcons.groupCrest(g.crest||{icon:'⚡',color:'#FFD813'},'group-room-crest');
  function avatar(member){
    let photo='';
    try{const url=new URL(member.avatarUrl);if(url.protocol==='https:')photo=url.href;}catch{}
    return `<span class="group-player-avatar">${photo?`<img src="${esc(photo)}" alt="" width="36" height="36" loading="lazy"/>`:esc((member.name||member.avatar||'B').slice(0,1).toUpperCase())}</span>`;
  }
  function memberRow(member,group,owner){
    return `<div class="group-player">${avatar(member)}<div><strong>${esc(member.name||'Braini Player')}</strong><small>${member.role==='owner'?'Owner':member.role==='admin'?'Admin':'Member'} · ${number(member.dailyScore)} today</small></div>${owner&&member.role!=='owner'?`<button class="group-remove" data-remove-group-member="${esc(group.id)}|${esc(member.userId||member.id)}" aria-label="Remove ${esc(member.name)} from group">×</button>`:''}</div>`;
  }
  function card(group){
    const owner=(group.myRole||(group.ownerId==='self'?'owner':'member'))==='owner';
    const members=group.members||[],count=Number(group.memberCount??members.length),missing=Math.max(0,3-count);
    const pending=group.pendingInvites||[];
    return `<article class="group-room">
      <header class="group-room-header">${crest(group)}<div><p class="group-room-role">${owner?'Your team · Owner':'Your team'}</p><h3>${esc(group.name)}</h3><span class="group-room-meta">${count}/5 members${group.country?' · '+esc(group.country):''}</span></div></header>
      <p class="group-room-status ${group.eligible?'is-ready':''}">${group.eligible?'✓ On the group leaderboard':`${missing} more ${missing===1?'friend':'friends'} to join the rankings`}</p>
      <div class="group-room-scores" aria-label="Group scores"><div class="group-today"><span>Today</span><strong>${number(group.dailyScore)}</strong></div><div><span>This week</span><strong>${number(group.weeklyScore)}</strong></div><div><span>This month</span><strong>${number(group.monthlyScore)}</strong></div></div>
      <div class="group-room-actions">${owner&&group.inviteCode&&count<5?`<button class="group-invite-primary" data-share-group="${esc(group.id)}">${icon('invite')}Invite friends</button>`:''}<a href="/rankings/?mode=group">${icon('trophy')}Group rankings</a></div>
      <details class="group-room-members"><summary><span>${icon('people')}Members</span><span>${count}/5 <b aria-hidden="true">+</b></span></summary><div class="group-player-list">${members.map(m=>memberRow(m,group,owner)).join('')}</div>
      ${pending.length?`<div class="group-room-pending"><p>Invitations pending</p>${pending.map(i=>`<div><span>${esc(i.name)}</span>${owner?`<button class="group-remove" data-cancel-group-invite="${esc(i.id)}" aria-label="Cancel invitation to ${esc(i.name)}">×</button>`:''}</div>`).join('')}</div>`:''}
      </details>
      <details class="group-room-settings"><summary>${owner?'Group settings':'Membership options'}</summary><div>${owner?`<button data-edit-group="${esc(group.id)}">Edit group & invite friends</button>`:''}<button class="group-danger" data-leave-group="${esc(group.id)}">${owner?'Delete group':'Leave group'}</button></div></details>
    </article>`;
  }
  function invitations(invites){
    if(!invites.length)return '';
    return `<section class="group-inbox" aria-label="Group invitations"><h2>You’re invited <span>${invites.length}</span></h2>${invites.map(i=>`<div class="group-inbox-row">${crest(i)}<div><strong>${esc(i.groupName)}</strong><p>${esc(i.inviterName)} invited you to join.</p></div><div class="group-inbox-actions"><button class="group-invite-primary" data-accept-group-invite="${esc(i.id)}">Join group</button><button data-decline-group-invite="${esc(i.id)}">Decline</button></div></div>`).join('')}</section>`;
  }
  function markup({authenticated,groups=[],invites=[]}){
    if(!authenticated)return `<section class="group-welcome"><img src="/assets/icons/product/group-team.svg" width="80" height="80" alt=""/><h2>Better with your people.</h2><p>Start a team, invite your friends and see how you do together.</p><button class="btn" data-social-auth>Sign in to get started</button></section>`;
    return `${invitations(invites)}<div class="group-workspace-heading"><h2>Your teams${groups.length?` <span>${groups.length}</span>`:''}</h2>${groups.length?`<button class="btn" data-create-group>${icon('plus')}Create group</button>`:''}</div>${groups.length?`<div class="group-room-grid">${groups.map(card).join('')}</div>`:`<section class="group-welcome"><img src="/assets/icons/product/group-team.svg" width="80" height="80" alt=""/><h3>Who’s on your team?</h3><p>Pick a name and invite up to four friends.</p><button class="btn" data-create-group>${icon('plus')}Create your first group</button></section>`}`;
  }
  return {markup};
})();
