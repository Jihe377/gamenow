const FLEET = [
  { name: "carrier", size: 5 },
  { name: "battleship", size: 4 },
  { name: "cruiser", size: 3 },
  { name: "submarine", size: 3 },
  { name: "destroyer", size: 2 },
];

const CONFIG_KEY = "gamenowBattleshipConfig";
const SESSION_KEY = "gamenowBattleshipSession";
const PROFILE_KEY = "gamenowBattleshipProfileName";
const ANIMAL_EMOJIS = ["🐱", "🐶", "🐼", "🐯", "🦊", "🐻", "🐨", "🐸", "🐵", "🐧", "🦁", "🐰"];

const state = {
  config: { restUrl: "", wsUrl: "" },
  session: null,
  route: null,
  room: null,
  game: null,
  ws: null,
  wsIntentionalClose: false,
  roomJoined: false,
  configOpen: false,
  rulesOpen: false,
  profileName: "",
  chat: [],
  placement: {
    orientation: "horizontal",
    draft: [],
  },
};

const els = {};

document.addEventListener("DOMContentLoaded", () => {
  cacheElements();
  bindEvents();
  loadConfig();
  loadSession();
  state.route = parseRoute(window.location.pathname);
  renderAll();
  void onRouteChanged();
});

function cacheElements() {
  [
    "view-home",
    "view-battleship",
    "view-room",
    "brand-button",
    "status-message",
    "connection-status",
    "home-continue-room",
    "toggle-rules",
    "rules-panel",
    "lobby-player-name-input",
    "lobby-room-id-input",
    "create-room",
    "join-room",
    "room-page-title",
    "room-page-subtitle",
    "share-link-label",
    "copy-room-link",
    "seat-strip",
    "room-waiting-actions",
    "start-game",
    "leave-seat",
    "waiting-action-note",
    "room-guest-panel",
    "room-live-panel",
    "room-player-name-input",
    "join-current-room",
    "room-continue-current",
    "session-name",
    "session-room-code",
    "session-seat",
    "session-player-id",
    "session-connection",
    "room-meta",
    "player-list",
    "refresh-room",
    "leave-room",
    "end-game-btn",
    "placement-next-ship",
    "placement-orientation",
    "toggle-orientation",
    "randomize-ships",
    "reset-ships",
    "submit-ships",
    "battle-title",
    "round-pill",
    "game-summary",
    "own-board-title",
    "own-board-panel",
    "own-board",
    "placement-panel",
    "opponent-panel",
    "opponent-board",
    "opponent-board-title",
    "chat-log",
    "chat-input",
    "send-chat",
    "config-panel",
    "config-backdrop",
    "close-config",
    "rest-url",
    "ws-url",
    "save-config",
  ].forEach((id) => {
    els[toCamel(id)] = document.getElementById(id);
  });
}

function bindEvents() {
  els.brandButton.addEventListener("click", () => navigateTo("/"));
  els.brandButton.addEventListener("dblclick", (event) => {
    event.preventDefault();
    openConfigPanel();
  });

  document.addEventListener("click", (event) => {
    const nav = event.target.closest("[data-nav]");
    if (nav) {
      navigateTo(nav.dataset.nav);
    }
  });

  els.homeContinueRoom.addEventListener("click", () => {
    if (state.session?.roomId) {
      navigateTo(roomPath(state.session.roomId));
    }
  });

  els.toggleRules.addEventListener("click", () => {
    state.rulesOpen = !state.rulesOpen;
    renderRulesPanel();
  });

  els.createRoom.addEventListener("click", createRoom);
  els.joinRoom.addEventListener("click", () => {
    const roomId = normalizeRoomId(els.lobbyRoomIdInput.value);
    if (roomId) {
      void joinRoomByCode(roomId);
    } else {
      setStatus("Please enter a 4-digit room code.", true);
    }
  });
  els.joinCurrentRoom.addEventListener("click", () => {
    if (state.route?.name === "room") {
      void joinRoomByCode(state.route.roomId);
    }
  });
  els.roomContinueCurrent.addEventListener("click", () => {
    if (state.session?.roomId) {
      navigateTo(roomPath(state.session.roomId));
    }
  });

  els.copyRoomLink.addEventListener("click", copyRoomLink);
  els.refreshRoom.addEventListener("click", refreshAll);
  els.leaveRoom.addEventListener("click", leaveRoom);
  els.endGameBtn.addEventListener("click", forfeitGame);
  els.startGame.addEventListener("click", startRoom);
  els.leaveSeat.addEventListener("click", leaveRoom);
  els.toggleOrientation.addEventListener("click", toggleOrientation);
  els.randomizeShips.addEventListener("click", randomizeShips);
  els.resetShips.addEventListener("click", resetShips);
  els.submitShips.addEventListener("click", submitShips);
  els.sendChat.addEventListener("click", sendChat);

  els.chatInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      sendChat();
    }
  });

  els.lobbyPlayerNameInput.addEventListener("input", (event) => syncPlayerNameInputs(event.target.value));
  els.roomPlayerNameInput.addEventListener("input", (event) => syncPlayerNameInputs(event.target.value));
  els.lobbyRoomIdInput.addEventListener("input", () => normalizeRoomId(els.lobbyRoomIdInput.value));

  els.saveConfig.addEventListener("click", saveConfig);
  els.closeConfig.addEventListener("click", closeConfigPanel);
  els.configBackdrop.addEventListener("click", closeConfigPanel);

  document.addEventListener("keydown", handleGlobalKeydown);
  window.addEventListener("popstate", () => {
    state.route = parseRoute(window.location.pathname);
    renderAll();
    void onRouteChanged();
  });
}

function handleGlobalKeydown(event) {
  if (event.key === "Escape" && state.configOpen) {
    closeConfigPanel();
  }
  if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === "c") {
    event.preventDefault();
    openConfigPanel();
  }
}

function loadConfig() {
  const saved = readJson(CONFIG_KEY);
  if (saved) {
    state.config = saved;
  }
  els.restUrl.value = state.config.restUrl;
  els.wsUrl.value = state.config.wsUrl;
}

function loadSession() {
  state.session = readJson(SESSION_KEY);
  state.profileName = localStorage.getItem(PROFILE_KEY) || state.session?.playerName || generateDefaultPlayerName();
  syncPlayerNameInputs(state.profileName);
}

function saveConfig() {
  state.config.restUrl = normalizeBaseUrl(els.restUrl.value);
  state.config.wsUrl = normalizeBaseUrl(els.wsUrl.value);
  localStorage.setItem(CONFIG_KEY, JSON.stringify(state.config));
  closeConfigPanel();
  setStatus("API configuration saved.");
}

function openConfigPanel() {
  state.configOpen = true;
  renderConfigPanel();
}

function closeConfigPanel() {
  state.configOpen = false;
  renderConfigPanel();
}

function syncPlayerNameInputs(value, persist = true) {
  const normalized = String(value || "").trimStart().slice(0, 24);
  state.profileName = normalized;
  els.lobbyPlayerNameInput.value = normalized;
  els.roomPlayerNameInput.value = normalized;
  if (persist) {
    localStorage.setItem(PROFILE_KEY, normalized);
  }
}

function persistSession() {
  if (state.session) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(state.session));
  } else {
    localStorage.removeItem(SESSION_KEY);
  }
}

function parseRoute(pathname) {
  const segments = pathname.replace(/\/+$/, "").split("/").filter(Boolean);
  if (segments.length === 0) {
    return { name: "home" };
  }
  if (segments[0] === "battleship" && segments.length === 1) {
    return { name: "battleship" };
  }
  if (segments[0] === "battleship" && segments.length === 2 && isRoomIdSegment(segments[1])) {
    return { name: "room", roomId: segments[1] };
  }
  return { name: "home" };
}

function navigateTo(path, replace = false) {
  if (window.location.pathname !== path) {
    window.history[replace ? "replaceState" : "pushState"]({}, "", path);
  }
  state.route = parseRoute(path);
  renderAll();
  void onRouteChanged();
}

async function onRouteChanged() {
  renderRoomPageHeader();
  if (state.route.name !== "room") {
    disconnectSocket();
    state.room = null;
    state.game = null;
    state.chat = [];
    state.roomJoined = false;
    renderAll();
    return;
  }

  if (state.route.roomId) {
    els.lobbyRoomIdInput.value = state.route.roomId;
  }

  if (state.session?.roomId === state.route.roomId && state.config.restUrl && state.config.wsUrl) {
    await restoreSession();
    return;
  }

  disconnectSocket();
  state.room = null;
  state.game = null;
  state.chat = [];
  state.roomJoined = false;
  if (state.config.restUrl) {
    await fetchPublicRoom(state.route.roomId);
  }
  renderAll();
}

async function createRoom() {
  try {
    ensureConfigured();
    const playerName = requirePlayerName();
    const room = await apiRequest("/rooms", {
      method: "POST",
      body: {
        gameType: "battleship",
        playerName,
      },
    });

    setSession(room);
    navigateTo(roomPath(room.roomId));
    await restoreSession();
    setStatus(`Room ${room.roomId} created. Share the link with your friend.`);
  } catch (error) {
    setStatus(error.message, true);
  }
}

async function joinRoomByCode(roomId) {
  try {
    ensureConfigured();
    if (hasSavedSessionForRoom(roomId)) {
      if (state.route?.name !== "room" || state.route.roomId !== roomId) {
        navigateTo(roomPath(roomId));
      }
      await restoreSession();
      setStatus(`Restored your seat in room ${roomId}.`);
      return;
    }
    const playerName = requirePlayerName();
    const room = await apiRequest(`/rooms/${roomId}/join`, {
      method: "POST",
      body: { playerName },
    });

    setSession(room);
    if (state.route?.name !== "room" || state.route.roomId !== room.roomId) {
      navigateTo(roomPath(room.roomId));
    }
    await restoreSession();
    setStatus(`Joined room ${room.roomId}.`);
  } catch (error) {
    setStatus(error.message, true);
  }
}

async function leaveRoom() {
  if (!state.session) {
    setStatus("You have not joined a room yet.", true);
    return;
  }

  try {
    await apiRequest(`/rooms/${state.session.roomId}/leave`, {
      method: "POST",
      body: {
        playerId: state.session.playerId,
        playerToken: state.session.playerToken,
      },
    });
    clearSession("You left the room.");
    navigateTo("/battleship");
  } catch (error) {
    setStatus(error.message, true);
  }
}

async function startRoom() {
  if (!state.session) {
    setStatus("Join a room first.", true);
    return;
  }
  if (!isHostPlayer()) {
    setStatus("Only the host can start the game.", true);
    return;
  }

  try {
    await apiRequest(`/rooms/${state.session.roomId}/start`, {
      method: "POST",
      body: {
        playerId: state.session.playerId,
        playerToken: state.session.playerToken,
      },
    });
    await refreshAll();
    setStatus("Game started. Place your fleet.");
  } catch (error) {
    setStatus(error.message, true);
  }
}

async function forfeitGame() {
  if (!state.session) {
    return;
  }
  if (!confirm("End this game and return to the room lobby?")) {
    return;
  }
  try {
    await apiRequest(`/battleship/${state.session.roomId}/forfeit`, {
      method: "POST",
      body: {
        playerId: state.session.playerId,
        playerToken: state.session.playerToken,
      },
    });
    state.game = null;
    await refreshAll();
    setStatus("Game ended. Room is back to the lobby.");
  } catch (error) {
    setStatus(error.message, true);
  }
}

async function kickPlayer(targetPlayerId) {
  if (!state.session) {
    return;
  }

  try {
    await apiRequest(`/rooms/${state.session.roomId}/leave`, {
      method: "POST",
      body: {
        playerId: state.session.playerId,
        playerToken: state.session.playerToken,
        targetPlayerId,
      },
    });
    await refreshAll();
    setStatus("Player removed from the room.");
  } catch (error) {
    setStatus(error.message, true);
  }
}

async function restoreSession() {
  if (!state.session || state.route?.name !== "room" || state.route.roomId !== state.session.roomId) {
    return;
  }

  ensureConfigured();
  state.roomJoined = false;
  await refreshAll();
  connectSocket();
}

async function refreshAll() {
  if (!isRoomRoute()) {
    renderAll();
    return;
  }

  try {
    if (isViewingLiveRoom()) {
      await fetchRoom();
      if (!isWaitingRoomStage()) {
        await fetchGame();
      }
    } else if (state.route?.roomId) {
      await fetchPublicRoom(state.route.roomId);
    }
  } catch (error) {
    setStatus(error.message, true);
  }
  renderAll();
}

async function fetchRoom() {
  const room = await apiRequest(`/rooms/${state.session.roomId}`);
  state.room = room;

  const me = room.players.find((player) => player.playerId === state.session.playerId);
  if (!me) {
    clearSession("You are no longer in this room.");
    return;
  }

  state.session.hostPlayerId = room.hostPlayerId;
  state.session.playerName = me.playerName;
  syncPlayerNameInputs(me.playerName);
  persistSession();
}

async function fetchPublicRoom(roomId) {
  if (!roomId) {
    return;
  }

  try {
    state.room = await apiRequest(`/rooms/${roomId}`);
  } catch (error) {
    state.room = null;
    throw error;
  }
}

async function fetchGame() {
  if (!state.session) {
    return;
  }
  const query = new URLSearchParams({
    playerId: state.session.playerId,
    playerToken: state.session.playerToken,
  });
  state.game = await apiRequest(`/battleship/${state.session.roomId}?${query.toString()}`);
}

function connectSocket() {
  if (!isViewingLiveRoom() || !state.config.wsUrl) {
    return;
  }

  if (state.ws) {
    state.wsIntentionalClose = true;
    state.ws.close();
  }

  clearJoinTimeout();
  state.wsIntentionalClose = false;
  setConnectionStatus("Connecting");

  const wsUrl = state.config.wsUrl;
  console.log("[WS] Opening WebSocket to", wsUrl);

  state.ws = new WebSocket(wsUrl);
  state.ws.addEventListener("open", () => {
    setConnectionStatus("Joining");
    setStatus("Restoring room connection...");
    const joinPayload = {
      action: "joinRoom",
      roomId: state.session.roomId,
      playerId: state.session.playerId,
      playerToken: state.session.playerToken,
    };
    console.log("[WS] Sending joinRoom:", joinPayload.roomId, joinPayload.playerId);
    sendWs(joinPayload);
    startJoinTimeout();
  });

  state.ws.addEventListener("message", handleWsMessage);
  state.ws.addEventListener("error", (event) => {
    console.error("[WS] WebSocket error event:", event);
  });
  state.ws.addEventListener("close", (event) => {
    console.log("[WS] WebSocket closed: code=%d reason=%s", event.code, event.reason);
    state.ws = null;
    state.roomJoined = false;
    clearJoinTimeout();
    setConnectionStatus("Disconnected");
    renderSessionSummary();
    if (!state.wsIntentionalClose && isViewingLiveRoom()) {
      setStatus("WebSocket disconnected. Starting poll fallback.", true);
      startPolling();
    }
  });
}

function startJoinTimeout() {
  clearJoinTimeout();
  state._joinTimer = setTimeout(() => {
    if (!state.roomJoined && state.ws) {
      console.warn("[WS] Join timeout after 8s, falling back to polling");
      setConnectionStatus("WS Join Timeout");
      setStatus("WebSocket join timed out. Using polling for updates.", true);
      startPolling();
    }
  }, 8000);
}

function clearJoinTimeout() {
  if (state._joinTimer) {
    clearTimeout(state._joinTimer);
    state._joinTimer = null;
  }
}

function startPolling() {
  stopPolling();
  if (!isViewingLiveRoom()) {
    return;
  }
  console.log("[Poll] Starting room polling fallback");
  state._pollTimer = setInterval(async () => {
    if (!isViewingLiveRoom()) {
      stopPolling();
      return;
    }
    try {
      await refreshAll();
    } catch (error) {
      console.error("[Poll] refresh error:", error);
    }
  }, 5000);
}

function stopPolling() {
  if (state._pollTimer) {
    clearInterval(state._pollTimer);
    state._pollTimer = null;
  }
}

function disconnectSocket() {
  state.roomJoined = false;
  clearJoinTimeout();
  stopPolling();
  if (!state.ws) {
    return;
  }
  state.wsIntentionalClose = true;
  state.ws.close();
  state.ws = null;
  setConnectionStatus("Disconnected");
}

async function handleWsMessage(event) {
  let payload;
  try {
    payload = JSON.parse(event.data);
  } catch (error) {
    return;
  }

  if (payload.type === "CHAT") {
    state.chat.push(payload);
    renderChat();
    return;
  }

  if (payload.type === "ROOM_JOINED") {
    console.log("[WS] ROOM_JOINED received:", payload);
    state.roomJoined = true;
    clearJoinTimeout();
    stopPolling();
    setConnectionStatus(payload.reconnected ? "Reconnected" : "Connected");
    renderSessionSummary();
    setStatus(payload.reconnected ? "Reconnected to the room." : "Connected to the room.");
    await refreshAll();
    return;
  }

  if (payload.type === "ROOM_JOIN_ERROR" || payload.type === "ERROR") {
    console.error("[WS] Server error:", payload);
    clearJoinTimeout();
    setConnectionStatus("Join Failed");
    setStatus(`WebSocket join failed: ${payload.error || "Unknown error"}. Using polling.`, true);
    startPolling();
    return;
  }

  if (payload.type === "GAME_STATE") {
    state.game = payload.state;
    renderAll();
    return;
  }

  if (
    payload.type === "PLAYER_JOINED" ||
    payload.type === "PLAYER_LEFT" ||
    payload.type === "ROOM_STARTED" ||
    payload.type === "ROOM_UPDATED"
  ) {
    if (payload.type === "ROOM_UPDATED" && payload.status === "waiting") {
      state.game = null;
    }
    await refreshAll();
  }
}

function sendWs(payload) {
  if (!state.ws || state.ws.readyState !== WebSocket.OPEN) {
    setStatus("WebSocket is not connected yet.", true);
    return;
  }
  state.ws.send(JSON.stringify(payload));
}

function sendChat() {
  const message = els.chatInput.value.trim();
  if (!message) {
    return;
  }
  sendWs({ action: "sendChat", message });
  els.chatInput.value = "";
}

function toggleOrientation() {
  state.placement.orientation = state.placement.orientation === "horizontal" ? "vertical" : "horizontal";
  renderPlacementSummary();
}

function resetShips() {
  state.placement.draft = [];
  renderAll();
}

function randomizeShips() {
  const draft = [];

  for (const ship of FLEET) {
    let placed = false;
    for (let attempt = 0; attempt < 100 && !placed; attempt += 1) {
      const placement = {
        name: ship.name,
        startRow: Math.floor(Math.random() * 10),
        startCol: Math.floor(Math.random() * 10),
        orientation: Math.random() > 0.5 ? "horizontal" : "vertical",
      };
      if (canPlaceShip(placement, draft)) {
        draft.push(placement);
        placed = true;
      }
    }
    if (!placed) {
      setStatus("Auto-placement failed. Please try again.", true);
      return;
    }
  }

  state.placement.draft = draft;
  renderAll();
}

async function submitShips() {
  if (!state.session) {
    setStatus("Join a room first.", true);
    return;
  }
  if (state.placement.draft.length !== FLEET.length) {
    setStatus("Place all ships before locking your fleet.", true);
    return;
  }

  try {
    state.game = await apiRequest(`/battleship/${state.session.roomId}/setup`, {
      method: "POST",
      body: {
        playerId: state.session.playerId,
        playerToken: state.session.playerToken,
        placements: state.placement.draft,
      },
    });
    await fetchRoom();
    setStatus("Fleet locked. Waiting for the other player.");
    renderAll();
  } catch (error) {
    setStatus(error.message, true);
  }
}

async function fireAt(row, col) {
  if (!state.session || !canFire()) {
    return;
  }

  try {
    state.game = await apiRequest(`/battleship/${state.session.roomId}/fire`, {
      method: "POST",
      body: {
        playerId: state.session.playerId,
        playerToken: state.session.playerToken,
        row,
        col,
      },
    });
    renderAll();
  } catch (error) {
    setStatus(error.message, true);
  }
}

function setSession(roomSession) {
  state.session = {
    roomId: roomSession.roomId,
    playerId: roomSession.playerId,
    playerToken: roomSession.playerToken,
    playerName: roomSession.playerName,
    hostPlayerId: roomSession.hostPlayerId,
  };
  syncPlayerNameInputs(roomSession.playerName);
  state.room = null;
  state.game = null;
  state.chat = [];
  state.placement.draft = [];
  state.roomJoined = false;
  persistSession();
}

function clearSession(message) {
  disconnectSocket();
  state.session = null;
  state.room = null;
  state.game = null;
  state.chat = [];
  state.placement.draft = [];
  state.roomJoined = false;
  persistSession();
  renderAll();
  if (message) {
    setStatus(message);
  }
}

function renderAll() {
  renderRoute();
  renderConfigPanel();
  renderRulesPanel();
  renderHome();
  renderRoomPageHeader();
  renderRoomAccess();
  renderSessionSummary();
  renderRoom();
  renderGame();
  renderChat();
  renderBoards();
  renderPlacementSummary();
}

function renderRoute() {
  els.viewHome.classList.toggle("hidden", state.route.name !== "home");
  els.viewBattleship.classList.toggle("hidden", state.route.name !== "battleship");
  els.viewRoom.classList.toggle("hidden", state.route.name !== "room");
}

function renderHome() {
  const canContinue = Boolean(state.session?.roomId);
  els.homeContinueRoom.disabled = !canContinue;
  els.homeContinueRoom.textContent = canContinue
    ? `Continue room ${state.session.roomId}`
    : "Continue Last Room";
}

function renderRoomPageHeader() {
  const roomId = state.route?.roomId || "----";
  els.roomPageTitle.textContent = `Room code: ${roomId}`;
  els.roomPageSubtitle.textContent = roomHeaderSubtitle();
  els.shareLinkLabel.textContent = window.location.origin + roomPath(roomId);
  els.roomContinueCurrent.disabled = !state.session?.roomId;
  els.copyRoomLink.textContent = "Invite Friend";
  els.leaveRoom.classList.add("hidden");
}

function renderRoomAccess() {
  const roomRoute = isRoomRoute();
  const live = isViewingLiveRoom();
  const allowGuestJoin = roomRoute && !live && (!state.room || (state.room.status === "waiting" && !hasAllPlayers()));
  els.roomGuestPanel.classList.toggle("hidden", !allowGuestJoin);
  els.roomLivePanel.classList.toggle("hidden", !roomRoute);
}

function renderConfigPanel() {
  els.configPanel.classList.toggle("hidden", !state.configOpen);
  els.configPanel.setAttribute("aria-hidden", String(!state.configOpen));
}

function renderRulesPanel() {
  els.rulesPanel.classList.toggle("hidden", !state.rulesOpen);
}

function renderSessionSummary() {
  const name = state.session?.playerName || state.profileName || "Guest";
  els.sessionName.textContent = name;
  els.sessionRoomCode.textContent = state.session?.roomId || state.route?.roomId || "----";
  els.sessionSeat.textContent = seatLabel();
  els.sessionPlayerId.textContent = sessionIdentityLabel();
  els.sessionConnection.textContent = state.session ? (state.roomJoined ? "Connected" : "Saved") : "Idle";
}

function renderRoom() {
  if (!isRoomRoute() || !state.room) {
    els.seatStrip.innerHTML = buildSeatStrip(null);
    els.roomMeta.innerHTML = '<div class="mode-pill">Loading room details...</div>';
    renderWaitingActions();
    return;
  }

  els.seatStrip.innerHTML = buildSeatStrip(state.room);
  els.seatStrip.querySelectorAll("[data-join-seat]").forEach((button) => {
    button.addEventListener("click", () => {
      if (state.route?.name === "room") {
        void joinRoomByCode(state.route.roomId);
      }
    });
  });
  els.roomMeta.innerHTML = `
    <div class="mode-pill">Mode: Battleship Duel</div>
    <div>${escapeHtml(roomStateLine())}</div>
  `;
  renderWaitingActions();

  const inGame = isViewingLiveRoom() && !isWaitingRoomStage();
  els.endGameBtn.classList.toggle("hidden", !inGame);
}

function renderGame() {
  if (!isRoomRoute()) {
    els.battleTitle.textContent = "Waiting to Enter";
    els.roundPill.textContent = "Round -";
    els.gameSummary.innerHTML = `
      <div class="stage-summary-line">Open a room link to enter the game.</div>
      <div class="stage-summary-subline">Room links use the format ${escapeHtml(state.route?.roomId ? roomPath(state.route.roomId) : "/battleship/1234")}.</div>
    `;
    els.opponentBoardTitle.textContent = "Attack Grid";
    els.ownBoardTitle.textContent = "Defense Grid";
    els.placementPanel.classList.add("hidden");
    els.opponentPanel.classList.add("hidden");
    return;
  }

  if (!isViewingLiveRoom()) {
    els.battleTitle.textContent = state.room ? "Room Preview" : "Loading Room";
    els.roundPill.textContent = "Round -";
    els.gameSummary.innerHTML = `
      <div class="stage-summary-line">Join this room to enter the live match.</div>
      <div class="stage-summary-subline">${escapeHtml(state.room ? roomStateLine() : "Loading public room state.")}</div>
    `;
    els.opponentBoardTitle.textContent = "Attack Grid";
    els.ownBoardTitle.textContent = "Defense Grid";
    els.placementPanel.classList.add("hidden");
    els.opponentPanel.classList.add("hidden");
    els.ownBoardPanel.classList.add("hidden");
    return;
  }

  if (isWaitingRoomStage()) {
    els.battleTitle.textContent = isHostPlayer() ? "Waiting Room" : "Choose a Seat";
    els.roundPill.textContent = `Players ${state.room?.players?.length || 0}/2`;
    els.gameSummary.innerHTML = `
      <div class="stage-summary-line">${escapeHtml(waitingRoomHeadline())}</div>
      <div class="stage-summary-subline">${escapeHtml(waitingRoomSubline())}</div>
    `;
    els.placementPanel.classList.add("hidden");
    els.opponentPanel.classList.add("hidden");
    els.ownBoardPanel.classList.add("hidden");
    return;
  }

  els.battleTitle.textContent = battleTitle();
  els.roundPill.textContent = `Round ${state.game?.roundNumber || 1}`;
  els.ownBoardTitle.textContent = "Your Board";
  els.opponentBoardTitle.textContent = state.game?.opponentBoard?.playerName
    ? `${state.game.opponentBoard.playerName}'s Board`
    : "Attack Grid";

  if (!state.game) {
    els.gameSummary.innerHTML = `
      <div class="stage-summary-line">Loading match state...</div>
      <div class="stage-summary-subline">Please wait while the room syncs.</div>
    `;
    els.placementPanel.classList.add("hidden");
    els.opponentPanel.classList.add("hidden");
    els.ownBoardPanel.classList.remove("hidden");
    return;
  }

  els.gameSummary.innerHTML = `
    <div class="stage-summary-line">${escapeHtml(combatStatus())}</div>
    <div class="stage-summary-subline">${escapeHtml(stageSubline())}</div>
  `;

  const setupPhase = state.game.phase === "setup";
  const playingPhase = state.game.phase === "playing" || state.game.phase === "finished";
  els.ownBoardPanel.classList.remove("hidden");
  els.placementPanel.classList.toggle("hidden", !setupPhase);
  els.opponentPanel.classList.toggle("hidden", !playingPhase);
}

function renderWaitingActions() {
  const show = isViewingLiveRoom() && isWaitingRoomStage();
  els.roomWaitingActions.classList.toggle("hidden", !show);
  if (!show) {
    return;
  }

  const host = isHostPlayer();
  const full = hasAllPlayers();
  els.startGame.classList.toggle("hidden", !host);
  els.startGame.disabled = !full;
  els.leaveSeat.disabled = false;
  els.waitingActionNote.textContent = host
    ? (full ? "All seats are filled. You can start the game now." : "Invite one more player. Start unlocks when both seats are filled.")
    : "The host will start the game after both seats are filled.";
}

function renderChat() {
  if (els.chatLog) {
    els.chatLog.innerHTML = "";
  }
}

function renderPlacementSummary() {
  const nextShip = FLEET[state.placement.draft.length];
  els.placementNextShip.textContent = nextShip
    ? `Next ship: ${nextShip.name} (${nextShip.size})`
    : "All ships placed. Lock your fleet.";
  els.placementOrientation.textContent = `Orientation: ${state.placement.orientation}`;
}

function renderBoards() {
  renderOwnBoard();
  renderOpponentBoard();
}

function renderOwnBoard() {
  if (!isRoomRoute()) {
    els.ownBoard.innerHTML = buildBoardHtml(() => ({ classes: ["board-cell"], label: "", action: "" }));
    return;
  }

  if (!isViewingLiveRoom()) {
    els.ownBoard.innerHTML = buildBoardHtml(() => ({ classes: ["board-cell"], label: "", action: "" }));
    return;
  }

  const shipCells = new Map();
  const placements = canPlaceShips() ? draftShipsAsPublic() : (state.game?.ownBoard?.ships || []);
  placements.forEach((ship) => ship.cells.forEach((cell) => shipCells.set(cell, ship)));

  const received = new Map();
  (state.game?.ownBoard?.shotsReceived || []).forEach((shot) => received.set(shot.cell, shot));

  els.ownBoard.innerHTML = buildBoardHtml((row, col) => {
    const cell = `${row},${col}`;
    const classes = ["board-cell"];
    let label = "";

    if (shipCells.has(cell)) {
      classes.push("ship");
      label = "S";
    }
    if (received.has(cell)) {
      const shot = received.get(cell);
      classes.push(shot.result === "hit" ? "hit" : "miss");
      label = shot.result === "hit" ? "X" : "•";
    }
    if (canPlaceShips()) {
      classes.push("clickable");
    }

    return {
      classes,
      label,
      action: canPlaceShips() ? `data-own-cell="${row},${col}"` : "",
    };
  });

  els.ownBoard.querySelectorAll("[data-own-cell]").forEach((cell) => {
    cell.addEventListener("click", () => placeShipAt(cell.dataset.ownCell));
  });
}

function renderOpponentBoard() {
  if (!isRoomRoute()) {
    els.opponentBoard.innerHTML = buildBoardHtml(() => ({ classes: ["board-cell"], label: "", action: "" }));
    return;
  }

  if (!isViewingLiveRoom()) {
    els.opponentBoard.innerHTML = buildBoardHtml(() => ({ classes: ["board-cell"], label: "", action: "" }));
    return;
  }

  const fired = new Map();
  (state.game?.opponentBoard?.shotsFired || []).forEach((shot) => fired.set(shot.cell, shot));
  const pendingCell = state.game?.currentRound?.yourShot?.cell;

  els.opponentBoard.innerHTML = buildBoardHtml((row, col) => {
    const cell = `${row},${col}`;
    const classes = ["board-cell"];
    let label = "";
    const shot = fired.get(cell);

    if (shot) {
      classes.push(shot.result === "hit" ? "hit" : "miss");
      label = shot.result === "hit" ? "X" : "•";
    } else if (pendingCell === cell) {
      classes.push("pending");
      label = "…";
    } else if (canFire()) {
      classes.push("clickable");
    }

    return {
      classes,
      label,
      action: canFire() && !shot && pendingCell !== cell ? `data-opponent-cell="${row},${col}"` : "",
    };
  });

  els.opponentBoard.querySelectorAll("[data-opponent-cell]").forEach((cell) => {
    cell.addEventListener("click", () => {
      const [row, col] = cell.dataset.opponentCell.split(",").map(Number);
      fireAt(row, col);
    });
  });
}

function buildBoardHtml(cellRenderer) {
  const cells = [];
  for (let row = 0; row < 10; row += 1) {
    for (let col = 0; col < 10; col += 1) {
      const rendered = cellRenderer(row, col);
      cells.push(`<div class="${rendered.classes.join(" ")}" ${rendered.action}>${rendered.label}</div>`);
    }
  }
  return cells.join("");
}

function draftShipsAsPublic() {
  return state.placement.draft.map((placement) => ({
    name: placement.name,
    cells: shipCellsFromPlacement(placement),
    hits: [],
  }));
}

function placeShipAt(cellId) {
  const nextShip = FLEET[state.placement.draft.length];
  if (!nextShip) {
    return;
  }

  const [startRow, startCol] = cellId.split(",").map(Number);
  const placement = {
    name: nextShip.name,
    startRow,
    startCol,
    orientation: state.placement.orientation,
  };

  if (!canPlaceShip(placement, state.placement.draft)) {
    setStatus("That ship cannot be placed there.", true);
    return;
  }

  state.placement.draft.push(placement);
  renderAll();
}

function canPlaceShip(placement, draft) {
  try {
    const cells = shipCellsFromPlacement(placement);
    const occupied = new Set(draft.flatMap(shipCellsFromPlacement));
    return cells.every((cell) => !occupied.has(cell));
  } catch (error) {
    return false;
  }
}

function shipCellsFromPlacement(placement) {
  const ship = FLEET.find((candidate) => candidate.name === placement.name);
  if (!ship) {
    throw new Error("Unknown ship");
  }

  const cells = [];
  for (let offset = 0; offset < ship.size; offset += 1) {
    const row = placement.startRow + (placement.orientation === "vertical" ? offset : 0);
    const col = placement.startCol + (placement.orientation === "horizontal" ? offset : 0);
    if (row < 0 || row >= 10 || col < 0 || col >= 10) {
      throw new Error("Out of bounds");
    }
    cells.push(`${row},${col}`);
  }
  return cells;
}

function playerReady(playerId) {
  return Boolean(state.game?.players?.find((player) => player.playerId === playerId)?.ready);
}

function canPlaceShips() {
  if (!isViewingLiveRoom() || !state.session) {
    return false;
  }
  if (isWaitingRoomStage()) {
    return false;
  }
  if (!state.game) {
    return true;
  }
  const me = state.game.players.find((player) => player.playerId === state.session.playerId);
  return Boolean(me) && !me.ready && state.game.phase !== "playing" && state.game.phase !== "finished";
}

function canFire() {
  return Boolean(isViewingLiveRoom() && state.game?.canFire && state.game?.opponentBoard?.playerId);
}

function isRoomRoute() {
  return state.route?.name === "room";
}

function isViewingLiveRoom() {
  return state.route?.name === "room" && state.session?.roomId === state.route.roomId;
}

function hasSavedSessionForRoom(roomId) {
  return Boolean(
    roomId &&
    state.session?.roomId === roomId &&
    state.session?.playerId &&
    state.session?.playerToken
  );
}

function isHostPlayer() {
  return Boolean(isViewingLiveRoom() && state.room?.hostPlayerId === state.session?.playerId);
}

function hasAllPlayers() {
  return (state.room?.players?.length || 0) >= 2;
}

function isWaitingRoomStage() {
  return Boolean(isRoomRoute() && state.room?.status === "waiting");
}

function seatLabel() {
  if (!state.room || !state.session) {
    return "Waiting";
  }
  const index = state.room.players.findIndex((player) => player.playerId === state.session.playerId);
  return index >= 0 ? `Seat ${index + 1}` : "Waiting";
}

function sessionIdentityLabel() {
  if (!state.session) {
    return "Not Joined";
  }
  if (state.room?.hostPlayerId === state.session.playerId) {
    return "Host";
  }
  return "Player";
}

function battleTitle() {
  if (!state.game) {
    return "Waiting to Start";
  }
  if (state.game.phase === "finished") {
    return renderWinnerLabel() === "Draw" ? "Draw Game" : `${renderWinnerLabel()} Wins`;
  }
  return combatStatus();
}

function combatStatus() {
  if (!state.game) {
    return "Waiting for match state.";
  }
  if (state.game.phase === "waiting_for_players") {
    return "Waiting for a second player.";
  }
  if (state.game.phase === "setup") {
    return canPlaceShips() ? "Deploy your fleet first." : "Waiting for the opponent to lock their fleet.";
  }
  if (state.game.phase === "finished") {
    return renderWinnerLabel() === "Draw" ? "Both fleets were destroyed at the same time." : `${renderWinnerLabel()} won the match.`;
  }
  if (state.game.canFire) {
    return "Ready to fire";
  }
  if (state.game.waitingForOpponent) {
    return "Shot submitted, waiting for opponent";
  }
  if (state.game.currentRound?.opponentSubmitted && !state.game.currentRound?.yourShot) {
    return "Opponent fired, submit your shot";
  }
  return "Round resolved";
}

function renderWinnerLabel() {
  if (!state.game?.winnerPlayerId) {
    return "None yet";
  }
  if (state.game.winnerPlayerId === "DRAW") {
    return "Draw";
  }
  return playerNameForId(state.game.winnerPlayerId);
}

function fleetStatus() {
  if (!state.game) {
    return "Not deployed";
  }
  const me = state.game.players.find((player) => player.playerId === state.session?.playerId);
  if (!me?.ready) {
    return `${state.placement.draft.length}/${FLEET.length} ships placed`;
  }
  const remaining = state.game.ownBoard.ships.reduce((count, ship) => count + (ship.sunk ? 0 : 1), 0);
  return `${remaining} ships still afloat`;
}

function summaryCard(label, value) {
  return `
    <div class="summary-card">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
    </div>
  `;
}

function buildSeatStrip(room) {
  const seats = [0, 1].map((index) => room?.players?.[index] || null);
  return seats.map((player, index) => renderSeatCard(player, index + 1, room)).join("");
}

function renderSeatCard(player, seatNumber, room) {
  if (!player) {
    const canJoin = !isViewingLiveRoom() && room?.status === "waiting";
    return `
      <div class="seat-card seat-empty">
        <div class="seat-avatar">
          ${canJoin
            ? '<button class="seat-join-button" data-join-seat type="button">Join</button>'
            : '<div class="seat-name">+</div>'}
          <span class="seat-index">${seatNumber}</span>
        </div>
        <div class="seat-helper">${canJoin ? "Tap to take this seat" : "Open seat"}</div>
      </div>
    `;
  }

  const isHost = room?.hostPlayerId === player.playerId;
  const isMe = state.session?.playerId === player.playerId;
  const ready = playerReady(player.playerId);
  const emoji = firstEmoji(player.playerName) || "🙂";
  const label = stripLeadingEmoji(player.playerName) || player.playerName || `Player ${seatNumber}`;

  return `
    <div class="seat-card">
      <div class="seat-avatar">
        <div class="seat-badge-stack">
          ${isHost ? '<span class="seat-badge">HOST</span>' : ""}
          ${isMe ? '<span class="seat-badge">YOU</span>' : ""}
        </div>
        <div class="seat-name">${escapeHtml(emoji)}</div>
        <span class="seat-status-dot${ready ? "" : " hidden"}"></span>
        <span class="seat-index">${seatNumber}</span>
      </div>
      <div class="seat-helper">${escapeHtml(label)}</div>
    </div>
  `;
}

function roomHeaderSubtitle() {
  if (!isRoomRoute()) {
    return "Open this room link to invite your friend.";
  }
  if (!state.room) {
    return "Loading room state...";
  }
  if (isWaitingRoomStage()) {
    return isViewingLiveRoom()
      ? "Seat players first, then let the host start the match."
      : "Choose a seat, enter your name, and join this room.";
  }
  if (isViewingLiveRoom()) {
    return stageSubline();
  }
  return "Pick a seat and join this room to start playing.";
}

function roomStateLine() {
  if (!state.room) {
    return "Loading room state...";
  }
  const hostLabel = state.room.hostPlayerName ? `Host ${state.room.hostPlayerName}` : "Host pending";
  return `Players ${state.room.players.length}/2 · ${formatPhase(state.room.status)} · ${hostLabel}`;
}

function waitingRoomHeadline() {
  if (!state.room) {
    return "Loading room state...";
  }
  if (!hasAllPlayers()) {
    return isHostPlayer() ? "Invite one more player to fill seat 2." : "Seat 1 is taken. Join now to play.";
  }
  return isHostPlayer() ? "Both seats are ready. Start the game when you are ready." : "Both seats are filled. Waiting for the host to start.";
}

function waitingRoomSubline() {
  if (!state.room) {
    return "Loading room state...";
  }
  if (!isViewingLiveRoom()) {
    return "Enter a name below and tap Join to sit down.";
  }
  return isHostPlayer()
    ? "You are the host. Leave your seat at any time, or start after seat 2 is filled."
    : "Your seat is saved. The host will unlock fleet placement once both players are in.";
}

function stageSubline() {
  if (!state.game) {
    return "Waiting for the game state to load.";
  }
  if (isWaitingRoomStage() || state.game.phase === "waiting_for_players") {
    return "Invite one more player to begin.";
  }
  if (state.game.phase === "setup") {
    return canPlaceShips()
      ? "Arrange your fleet and lock your layout."
      : "Waiting for the other player to finish setup.";
  }
  if (state.game.phase === "playing") {
    return state.game.canFire
      ? "Choose a target on the opponent board."
      : "The round will resolve after both players submit.";
  }
  if (state.game.phase === "finished") {
    return renderWinnerLabel() === "Draw"
      ? "The match ended in a draw."
      : `${renderWinnerLabel()} won this room.`;
  }
  return "Waiting for the next step.";
}

function firstEmoji(value) {
  if (!value) {
    return "";
  }
  const match = String(value).trim().match(/^\p{Extended_Pictographic}/u);
  return match ? match[0] : "";
}

function stripLeadingEmoji(value) {
  if (!value) {
    return "";
  }
  return String(value).trim().replace(/^\p{Extended_Pictographic}\s*/u, "");
}

async function apiRequest(path, options = {}) {
  const url = `${state.config.restUrl}${path}`;
  const response = await fetch(url, {
    method: options.method || "GET",
    headers: options.body ? { "Content-Type": "application/json" } : undefined,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const text = await response.text();
  const payload = text ? JSON.parse(text) : {};
  if (!response.ok) {
    throw new Error(payload.error || `Request failed (${response.status})`);
  }
  return payload;
}

function ensureConfigured() {
  if (els.restUrl.value.trim() && els.wsUrl.value.trim()) {
    state.config.restUrl = normalizeBaseUrl(els.restUrl.value);
    state.config.wsUrl = normalizeBaseUrl(els.wsUrl.value);
    localStorage.setItem(CONFIG_KEY, JSON.stringify(state.config));
  }
  if (!state.config.restUrl || !state.config.wsUrl) {
    throw new Error("Open the hidden config panel and save both REST and WebSocket URLs first.");
  }
}

function requirePlayerName() {
  const playerName = state.profileName.trim();
  if (playerName) {
    return playerName.slice(0, 24);
  }

  const fallbackName = generateDefaultPlayerName();
  syncPlayerNameInputs(fallbackName);
  return fallbackName;
}

function generateDefaultPlayerName() {
  return ANIMAL_EMOJIS[Math.floor(Math.random() * ANIMAL_EMOJIS.length)];
}

async function copyRoomLink() {
  if (state.route?.name !== "room") {
    return;
  }
  const fullUrl = `${window.location.origin}${roomPath(state.route.roomId)}`;
  try {
    await navigator.clipboard.writeText(fullUrl);
    setStatus("Room link copied.");
  } catch (error) {
    setStatus("Copy failed. Please copy the current URL manually.", true);
  }
}

function setStatus(message, isError = false) {
  els.statusMessage.textContent = message;
  els.statusMessage.style.color = isError ? "#b95757" : "#718198";
}

function setConnectionStatus(message) {
  els.connectionStatus.textContent = message;
}

function shortId(value) {
  return value ? value.slice(0, 8) : "";
}

function playerNameForId(playerId) {
  if (!playerId) {
    return "Unknown";
  }
  const roomPlayer = state.room?.players?.find((player) => player.playerId === playerId);
  if (roomPlayer?.playerName) {
    return roomPlayer.playerName;
  }
  if (state.session?.playerId === playerId && state.session?.playerName) {
    return state.session.playerName;
  }
  return shortId(playerId);
}

function normalizeBaseUrl(url) {
  return url.trim().replace(/\/$/, "");
}

function normalizeRoomId(value) {
  const digits = String(value || "").replace(/\D/g, "").slice(0, 4);
  els.lobbyRoomIdInput.value = digits;
  return digits.length === 4 ? digits : "";
}

function isRoomIdSegment(value) {
  return /^\d{4}$/.test(value) || /^[A-Za-z0-9]{8}$/.test(value);
}

function roomPath(roomId) {
  return `/battleship/${roomId}`;
}

function readJson(key) {
  const raw = localStorage.getItem(key);
  return raw ? JSON.parse(raw) : null;
}

function formatPhase(phase) {
  return (phase || "unknown").replace(/_/g, " ");
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[character]));
}

function toCamel(value) {
  return value.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}
