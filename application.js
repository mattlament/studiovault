import { fetchData, addLink, editLink, deleteLink } from "./firebase.js";
import { masterStudios } from "./studios.js";

// STATE
let studios = [];
let selectedTags = [];
let searchTerm = "";
let sortBy = "recent";
let editingId = null;

// ELEMENT REFERENCES
const grid = document.getElementById("studioGrid");
const searchInput = document.getElementById("searchInput");
const clearSearchBtn = document.getElementById("clearSearch");
const sortSelect = document.getElementById("sortSelect");
const filterToggle = document.getElementById("filterToggle");
const filterMenu = document.getElementById("filterMenu");
const tagList = document.getElementById("tagList");
const emptyState = document.getElementById("emptyState");
const resultCountText = document.getElementById("resultCount");

// INITIALIZE
async function init() {
  const data = await fetchData();
  studios = [...data, ...studios]
    .filter((x) => x.title)
    .map((x) => ({ ...x, tags: x.tags || [] }));
  render();
  setupEventListeners();
}

function setupEventListeners() {
  // Search logic
  searchInput.addEventListener("input", (e) => {
    searchTerm = e.target.value;
    clearSearchBtn.classList.toggle("hidden", !searchTerm);
    render();
  });

  clearSearchBtn.addEventListener("click", () => {
    searchTerm = "";
    searchInput.value = "";
    clearSearchBtn.classList.add("hidden");
    render();
  });

  // Sorting logic
  sortSelect.addEventListener("change", (e) => {
    sortBy = e.target.value;
    render();
  });

  // Category Dropdown logic
  filterToggle.addEventListener("click", (e) => {
    e.stopPropagation();
    filterMenu.classList.toggle("hidden");
  });

  document.addEventListener("click", (e) => {
    if (!filterMenu.contains(e.target) && e.target !== filterToggle) {
      filterMenu.classList.add("hidden");
    }
  });

  // Add Studio logic
  document
    .getElementById("addStudioBtn")
    .addEventListener("click", async () => {
      const nameInp = document.getElementById("newStudioName");
      const urlInp = document.getElementById("newStudioUrl");
      if (!urlInp.value) return;

      const title =
        nameInp.value || urlInp.value.split("//")[1]?.split(".")[0] || "Studio";
      const url = urlInp.value.startsWith("http")
        ? urlInp.value
        : `https://${urlInp.value}`;
      const tags = ["Added Source"];

      const firestoreId = await addLink(title, url, tags);
      studios.unshift({ id: Date.now(), firestoreId, title, url, tags });
      nameInp.value = "";
      urlInp.value = "";
      render();
    });
}

function getFavicon(url) {
  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
  } catch (e) {
    return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==";
  }
}

// MAIN RENDER ENGINE
function render() {
  // FILTER & SORT
  let filtered = studios.filter((s) => {
    const matchesSearch =
      s.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.url.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.tags.some((t) => t.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesTags =
      selectedTags.length === 0 || selectedTags.some((t) => s.tags.includes(t));
    return matchesSearch && matchesTags;
  });

  if (sortBy === "alpha") {
    filtered.sort((a, b) => a.title.localeCompare(b.title));
  } else {
    filtered.sort((a, b) => b.id - a.id);
  }

  // INJECT CARDS
  grid.innerHTML = "";
  filtered.forEach((studio) => {
    const isEditing = editingId === studio.firestoreId;
    const card = document.createElement("div");
    card.className =
      "group relative bg-white rounded-[32px] p-6 border border-stone-100 shadow-sm hover:shadow-2xl card-hover transition-all duration-500 flex flex-col justify-between overflow-hidden min-h-[250px]";

    if (isEditing) {
      card.innerHTML = `
                        <div class="relative z-10 space-y-3 h-full flex flex-col justify-between">
                            <div class="space-y-2">
                                <input id="editName" class="w-full bg-stone-50 p-2 rounded-lg text-sm font-bold border border-stone-200 focus:ring-1 ring-custom-blue outline-none" value="${studio.title}">
                                <input id="editUrl" class="w-full bg-stone-50 p-2 rounded-lg text-xs border border-stone-200 focus:ring-1 ring-custom-blue outline-none" value="${studio.url}">
                                <textarea id="editTags" class="w-full bg-stone-50 p-2 rounded-lg text-xs border border-stone-200 h-20 resize-none font-medium outline-none">${studio.tags.join(", ")}</textarea>
                            </div>
                            <div class="flex gap-2">
                                <button onclick="saveEdit('${studio.firestoreId}')" class="flex-1 bg-custom-blue text-white py-2 rounded-xl text-xs font-bold shadow-lg shadow-blue-100 hover-bg-custom-blue transition-colors">Save</button>
                                <button onclick="cancelEdit()" class="flex-1 bg-stone-100 text-stone-500 py-2 rounded-xl text-xs font-bold hover:bg-stone-200 transition-colors">Cancel</button>
                            </div>
                        </div>
                    `;
    } else {
      const tagHtml = studio.tags
        .map(
          (t) =>
            `<span class="px-2.5 py-1 rounded-lg bg-stone-50 text-[10px] font-black text-stone-400 uppercase tracking-widest group-hover:bg-white group-hover:text-custom-blue transition-colors shadow-sm border border-stone-100/50">${t}</span>`,
        )
        .join("");

      card.innerHTML = `
                        <a href="${studio.url}" target="_blank" class="no-underline h-full flex flex-col justify-between">
                            <div class="absolute inset-0 bg-gradient-to-br from-[#0C75DD]/0 to-[#0C75DD]/0 group-hover:from-[#0C75DD]/10 group-hover:to-[#0C75DD]/20 transition-colors duration-500"></div>
                            <div class="relative z-10">
                                <div class="flex justify-between items-start mb-8">
                                    <div class="w-14 h-14 rounded-2xl bg-white flex items-center justify-center overflow-hidden border border-stone-100 shadow-sm group-hover:shadow-md group-hover:scale-105 transition-all duration-500">
                                        <img src="${getFavicon(studio.url)}" class="w-8 h-8 object-contain">
                                    </div>
                                    <div class="flex gap-1 items-center">
                                        <div class="opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-custom-blue transform translate-x-2 group-hover:translate-x-0">
                                            <i data-lucide="arrow-up-right" class="w-5 h-5"></i>
                                        </div>
                                        <button onclick="event.preventDefault(); startEdit('${studio.firestoreId}')" class="text-stone-300 hover:text-custom-blue p-1.5 relative z-20 transition-all hover:scale-110" title="Edit Studio">
                                            <i data-lucide="pencil" class="w-4 h-4"></i>
                                        </button>
                                        <button onclick="event.preventDefault(); deleteStudio('${studio.firestoreId}')" class="text-stone-300 hover:text-red-500 p-1.5 relative z-20 transition-all hover:scale-110" title="Remove from vault">
                                            <i data-lucide="trash-2" class="w-4 h-4"></i>
                                        </button>
                                    </div>
                                </div>
                                <h3 class="text-xl font-bold text-stone-900 mb-1 group-hover:text-custom-blue transition-colors line-clamp-2 leading-tight tracking-tight">${studio.title}</h3>
                                <div class="flex flex-wrap gap-1.5 mt-4">${tagHtml}</div>
                            </div>
                            <div class="mt-8 relative z-10 pt-4 border-t border-stone-50">
                                <p class="text-[10px] text-stone-300 font-bold truncate group-hover:text-stone-400 transition-colors uppercase tracking-[0.1em]">${studio.url.replace("https://", "").replace("http://", "").replace("www.", "").split("/")[0]}</p>
                            </div>
                        </a>
                    `;
    }
    grid.appendChild(card);
  });

  // REFRESH ICONS
  lucide.createIcons();

  // UPDATE UI STATE
  emptyState.classList.toggle("hidden", filtered.length > 0);
  resultCountText.innerText = `${filtered.length} studios saved`;
  renderTagList();
}

function renderTagList() {
  const tags = Array.from(new Set(studios.flatMap((s) => s.tags))).sort();
  tagList.innerHTML = "";
  tags.forEach((tag) => {
    const isSelected = selectedTags.includes(tag);
    const btn = document.createElement("button");
    btn.className = `flex items-center justify-between px-3 py-2 rounded-lg text-left text-xs font-bold transition-colors ${isSelected ? "bg-[#0C75DD]/10 text-custom-blue" : "text-stone-600 hover:bg-stone-50"}`;
    btn.innerHTML = `<span>${tag}</span>${isSelected ? '<i data-lucide="check" class="w-3.5 h-3.5"></i>' : ""}`;
    btn.onclick = () => {
      if (isSelected) selectedTags = selectedTags.filter((t) => t !== tag);
      else selectedTags.push(tag);
      render();
    };
    tagList.appendChild(btn);
  });
  lucide.createIcons();

  const toggleBtn = document.getElementById("filterToggle");
  const label = document.getElementById("filterLabel");
  if (selectedTags.length > 0) {
    toggleBtn.classList.add(
      "text-custom-blue",
      "border-custom-blue",
      "ring-2",
      "ring-custom-blue",
    );
    label.innerText = `Categories (${selectedTags.length})`;
  } else {
    toggleBtn.classList.remove(
      "text-custom-blue",
      "border-custom-blue",
      "ring-2",
      "ring-custom-blue",
    );
    label.innerText = "Filter Categories";
  }

  document.getElementById("clearFilters").onclick = () => {
    selectedTags = [];
    render();
  };
}

// ACTION HANDLERS
window.startEdit = (firestoreId) => {
  editingId = firestoreId;
  render();
};
window.cancelEdit = () => {
  editingId = null;
  render();
};
window.saveEdit = async (firestoreId) => {
  const title = document.getElementById("editName").value;
  const url = document.getElementById("editUrl").value;
  const tags = document
    .getElementById("editTags")
    .value.split(",")
    .map((t) => t.trim())
    .filter((t) => t);
  await editLink(firestoreId, title, url, tags);
  studios = studios.map((s) =>
    s.firestoreId === firestoreId ? { ...s, title, url, tags } : s,
  );
  editingId = null;
  render();
};
window.deleteStudio = async (firestoreId) => {
  if (!confirm("Remove this studio from the vault?")) return;
  await deleteLink(firestoreId);
  studios = studios.filter((s) => s.firestoreId !== firestoreId);
  render();
};

// BOOT
init();
