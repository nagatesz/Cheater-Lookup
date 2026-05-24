document.getElementById('dumpBtn').addEventListener('click', async () => {
  const groupId = document.getElementById('groupId').value.trim();
  const statusDiv = document.getElementById('status');
  const btn = document.getElementById('dumpBtn');
  
  if (!groupId) {
    statusDiv.innerText = "Please enter a Group ID.";
    return;
  }

  btn.disabled = true;
  statusDiv.innerText = "Fetching roles...";

  try {
    // 1. Fetch roles
    const rolesRes = await fetch(`https://groups.roblox.com/v1/groups/${groupId}/roles`);
    if (!rolesRes.ok) throw new Error("Failed to fetch roles. Check Group ID.");
    const rolesData = await rolesRes.json();
    
    let allMembers = [];
    
    // 2. Fetch members for each role
    for (const role of rolesData.roles) {
      statusDiv.innerText = `Fetching rank: ${role.name}...`;
      let cursor = '';
      
      do {
        const memRes = await fetch(`https://groups.roblox.com/v1/groups/${groupId}/roles/${role.id}/users?limit=100&sortOrder=Asc&cursor=${cursor}`);
        if (!memRes.ok) {
          console.error("Failed on role", role.id);
          break;
        }
        
        const memData = await memRes.json();
        for (const user of memData.data) {
          allMembers.push({
            id: user.userId,
            username: user.username,
            rank: role.name
          });
        }
        
        statusDiv.innerText = `Dumped ${allMembers.length} members...`;
        cursor = memData.nextPageCursor || '';
      } while (cursor);
    }
    
    // 3. Generate TXT
    statusDiv.innerText = `Generating text file for ${allMembers.length} members...`;
    
    let txtContent = `VULTAR GROUP DUMP\nGroup ID: ${groupId}\nTotal Members: ${allMembers.length}\nGenerated: ${new Date().toLocaleString()}\n\n`;
    txtContent += `========================================================================\n`;
    txtContent += `USERNAME`.padEnd(25) + `| ROBLOX ID`.padEnd(15) + `| RANK`.padEnd(25) + `| PROFILE URL\n`;
    txtContent += `========================================================================\n`;
    
    for (const m of allMembers) {
      const username = m.username.padEnd(25);
      const id = m.id.toString().padEnd(12);
      const rank = m.rank.padEnd(25);
      const url = `https://www.roblox.com/users/${m.id}/profile`;
      
      txtContent += `${username}| ${id}| ${rank}| ${url}\n`;
    }
    
    // 4. Download
    const blob = new Blob([txtContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    chrome.downloads.download({
      url: url,
      filename: `roblox_group_${groupId}_dump.txt`,
      saveAs: true
    });
    
    statusDiv.innerText = `Done! Downloaded ${allMembers.length} members.`;
  } catch (err) {
    statusDiv.innerText = `Error: ${err.message}`;
  } finally {
    btn.disabled = false;
  }
});
