import { state } from "./state"
import { ConnectionState } from "./types"

export function updateSpeed(value: string) {
  state.spinDuration = Number.parseFloat(value)
  const speedValue = document.getElementById("speedValue")
  if (speedValue) {
    speedValue.textContent = value + "s"
  }
}

export function renderTable(isSpectator = false) {
  const tableBody = document.getElementById("itemsTableBody")
  if (!tableBody) return

  // Clear and hide the action column header if spectator
  const headerRow = tableBody.previousElementSibling?.querySelector("tr")
  if (headerRow) {
    const actionHeader = headerRow.querySelector("th:last-child")
    if (actionHeader) {
      ;(actionHeader as HTMLElement).style.display = isSpectator ? "none" : ""
    }
  }

  tableBody.innerHTML = ""

  state.items.forEach((item, index) => {
    const row = document.createElement("tr")
    const disabled = isSpectator ? "disabled" : ""
    row.innerHTML = `
      <td><input type="text" value="${item.name}" class="editable-field" data-index="${index}" data-field="name" ${disabled}></td>
      <td><input type="number" value="${item.quantity}" class="editable-field" data-index="${index}" data-field="quantity" ${disabled}></td>
      <td style="display: ${isSpectator ? "none" : ""}">
        <button class="remove-btn" data-index="${index}">&times;</button>
      </td>
    `
    tableBody.appendChild(row)
  })
}

function getRandomColor(): string {
  const palette = [
    "#ff6b6b",
    "#4ecdc4",
    "#45b7d1",
    "#feca57",
    "#ff9ff3",
    "#54a0ff",
    "#5f27cd",
    "#00d2d3",
    "#ff9f43",
    "#10ac84",
    "#ee5a24",
    "#0abde3",
    "#7bed9f",
    "#2e86de",
    "#a55eea",
    "#26de81",
    "#fc5c65",
    "#fd79a8",
  ]
  const usedColors = state.items.map((item) => item.color)
  const availableColors = palette.filter((color) => !usedColors.includes(color))

  if (availableColors.length > 0) {
    return availableColors[Math.floor(Math.random() * availableColors.length)]
  }
  return (
    "#" +
    Math.floor(Math.random() * 16777215)
      .toString(16)
      .padStart(6, "0")
  )
}

function saveItemsToSession() {
  sessionStorage.setItem("rouletteItems", JSON.stringify(state.items))
}

export function handleAddItem(event: Event) {
  event.preventDefault()
  const nameInput = document.getElementById("itemName") as HTMLInputElement | null
  const quantityInput = document.getElementById("itemQuantity") as HTMLInputElement | null

  if (!nameInput || !quantityInput) return

  const name = nameInput.value.trim()
  const quantity = Number.parseInt(quantityInput.value, 10)

  if (name && quantity > 0) {
    state.items.push({ name, quantity, color: getRandomColor() })
    nameInput.value = ""
    quantityInput.value = "10"
    nameInput.focus()
    saveItemsToSession()
  }
}

export function handleTableClick(event: MouseEvent) {
  const target = event.target as HTMLElement
  if (target.classList.contains("remove-btn")) {
    const index = Number.parseInt(target.dataset.index || "", 10)
    if (!isNaN(index)) {
      state.items.splice(index, 1)
      saveItemsToSession()
    }
  }
}

export function handleItemUpdate(event: Event) {
  const target = event.target as HTMLInputElement
  if (!target.classList.contains("editable-field")) return

  const index = Number.parseInt(target.dataset.index || "", 10)
  const field = target.dataset.field as "name" | "quantity"

  if (isNaN(index) || !field) return

  const item = state.items[index]
  if (!item) return

  if (field === "name") {
    item.name = target.value
  } else if (field === "quantity") {
    const newQuantity = Number.parseInt(target.value, 10)
    item.quantity = isNaN(newQuantity) || newQuantity < 0 ? 0 : newQuantity
  }

  saveItemsToSession()
}

export function updateConnectionStatus(connectionState: ConnectionState, attempt = 0) {
  state.connectionState = connectionState
  state.reconnectAttempt = attempt

  const statusDot = document.getElementById("connectionStatusDot")
  const tooltip = document.getElementById("connectionTooltip")
  const sessionInfo = document.querySelector(".session-info")

  if (!statusDot || !tooltip) return

  // Remove all status classes
  statusDot.className = "status-dot"

  // Remove existing counter if any
  const existingCounter = sessionInfo?.querySelector(".reconnect-counter")
  if (existingCounter) {
    existingCounter.remove()
  }

  switch (connectionState) {
    case ConnectionState.CONNECTED:
      statusDot.classList.add("status-connected")
      tooltip.textContent = "Connected and synced"
      break

    case ConnectionState.RECONNECTING:
      statusDot.classList.add("status-reconnecting")
      tooltip.textContent = `Reconnecting... Attempt ${attempt}`

      // Add attempt counter next to the dot
      if (attempt > 0 && sessionInfo) {
        const counter = document.createElement("span")
        counter.className = "reconnect-counter"
        counter.textContent = `(${attempt})`
        statusDot.parentNode?.appendChild(counter)
      }
      break

    case ConnectionState.FAILED:
      statusDot.classList.add("status-failed")
      tooltip.textContent = "Connection failed - Check your network"
      break

    case ConnectionState.OFFLINE:
      statusDot.classList.add("status-offline")
      tooltip.textContent = "Offline mode - Limited functionality"
      break
  }
}

export function getConnectionStatus(): ConnectionState {
  return state.connectionState
}
