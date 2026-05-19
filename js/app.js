import {
  fetchData,
  addLink,
  editLink,
  deleteLink,
  onAuthChange,
  logout,
} from "./firebase.js";

(async () => {
  // ─── AuthManager ────────────────────────────────────────────────────────────

  class AuthManager {
    #isLoggedIn = false;
    #authControls;
    #addFormContainer;
    #onChange;

    constructor(authControls, addFormContainer, onChange) {
      this.#authControls = authControls;
      this.#addFormContainer = addFormContainer;
      this.#onChange = onChange;

      onAuthChange((user) => {
        this.#isLoggedIn = !!user;
        this.#onChange(this.#isLoggedIn);
      });
    }

    get isLoggedIn() {
      return this.#isLoggedIn;
    }

    renderUI(onAddStudio) {
      if (this.#isLoggedIn) {
        this.#addFormContainer.innerHTML = `
          <div class="flex flex-col sm:flex-row gap-2 bg-white p-2 rounded-2xl shadow-xl border border-stone-100 w-full md:w-auto">
            <input type="text" id="newStudioName" placeholder="Studio Name"
              class="px-4 py-2 rounded-xl bg-stone-50 focus:outline-none focus:ring-2 ring-custom-blue transition-all text-sm md:w-32 lg:w-40" />
            <input type="text" id="newStudioUrl" placeholder="Paste URL..."
              class="px-4 py-2 rounded-xl bg-stone-50 focus:outline-none focus:ring-2 ring-custom-blue transition-all text-sm md:w-40 lg:w-48" />
            <button id="addStudioBtn"
              class="bg-custom-blue hover-bg-custom-blue text-white p-2 rounded-xl transition-all flex items-center justify-center gap-2 px-4 font-semibold text-sm whitespace-nowrap group shadow-lg shadow-blue-100">
              <i data-lucide="plus" class="w-4 h-4 group-hover:rotate-90 transition-transform"></i>
              <span>Add Studio</span>
            </button>
          </div>
        `;
        lucide.createIcons();
        this.#addFormContainer
          .querySelector("#addStudioBtn")
          .addEventListener("click", onAddStudio);

        this.#authControls.innerHTML = `
          <button id="logoutBtn" class="flex items-center gap-1.5 text-[11px] font-bold text-stone-400 hover:text-stone-600 uppercase tracking-widest transition-colors">
            <i data-lucide="log-out" class="w-3.5 h-3.5"></i>
            <span>Logout</span>
          </button>
        `;
        lucide.createIcons();
        this.#authControls
          .querySelector("#logoutBtn")
          .addEventListener("click", logout);
      } else {
        this.#addFormContainer.innerHTML = "";
        this.#authControls.innerHTML = "";
      }
    }
  }

  // ─── FilterManager ──────────────────────────────────────────────────────────

  class FilterManager {
    #selectedTags = [];
    #filterToggle;
    #filterMenu;
    #tagList;
    #filterLabel;
    #onFilter;

    constructor(filterToggle, filterMenu, tagList, filterLabel, onFilter) {
      this.#filterToggle = filterToggle;
      this.#filterMenu = filterMenu;
      this.#tagList = tagList;
      this.#filterLabel = filterLabel;
      this.#onFilter = onFilter;

      this.#setupDropdown();
    }

    get selectedTags() {
      return this.#selectedTags;
    }

    #setupDropdown() {
      this.#filterToggle.addEventListener("click", (e) => {
        e.stopPropagation();
        this.#filterMenu.classList.toggle("hidden");
      });

      document.addEventListener("click", (e) => {
        if (
          !this.#filterMenu.contains(e.target) &&
          e.target !== this.#filterToggle
        ) {
          this.#filterMenu.classList.add("hidden");
        }
      });

      this.#filterMenu.addEventListener("click", (e) => {
        if (e.target.closest("#clearFilters")) {
          this.#selectedTags = [];
          this.#onFilter();
        }
      });
    }

    #toggle(tag) {
      this.#selectedTags = this.#selectedTags.includes(tag)
        ? this.#selectedTags.filter((t) => t !== tag)
        : [...this.#selectedTags, tag];
      this.#onFilter();
    }

    render(allTags) {
      this.#tagList.innerHTML = "";
      allTags.forEach((tag) => {
        const isSelected = this.#selectedTags.includes(tag);
        const btn = document.createElement("button");
        btn.className = `flex items-center justify-between px-3 py-2 rounded-lg text-left text-xs font-bold transition-colors ${
          isSelected
            ? "bg-[#0C75DD]/10 text-custom-blue"
            : "text-stone-600 hover:bg-stone-50"
        }`;
        btn.innerHTML = `<span>${tag}</span>${isSelected ? '<i data-lucide="check" class="w-3.5 h-3.5"></i>' : ""}`;
        btn.addEventListener("click", () => this.#toggle(tag));
        this.#tagList.appendChild(btn);
      });
      lucide.createIcons();

      if (this.#selectedTags.length > 0) {
        this.#filterToggle.classList.add(
          "text-custom-blue",
          "border-custom-blue",
          "ring-2",
          "ring-custom-blue",
        );
        this.#filterLabel.innerText = `Categories (${this.#selectedTags.length})`;
      } else {
        this.#filterToggle.classList.remove(
          "text-custom-blue",
          "border-custom-blue",
          "ring-2",
          "ring-custom-blue",
        );
        this.#filterLabel.innerText = "Filter Categories";
      }
    }
  }

  // ─── StudioApp ──────────────────────────────────────────────────────────────

  class StudioApp {
    #studios = [];
    #searchTerm = "";
    #sortBy = "recent";
    #editingId = null;
    #auth;
    #filter;

    #grid;
    #searchInput;
    #clearSearchBtn;
    #sortSelect;
    #emptyState;
    #resultCountText;

    constructor() {
      this.#grid = document.getElementById("studioGrid");
      this.#searchInput = document.getElementById("searchInput");
      this.#clearSearchBtn = document.getElementById("clearSearch");
      this.#sortSelect = document.getElementById("sortSelect");
      this.#emptyState = document.getElementById("emptyState");
      this.#resultCountText = document.getElementById("resultCount");

      this.#filter = new FilterManager(
        document.getElementById("filterToggle"),
        document.getElementById("filterMenu"),
        document.getElementById("tagList"),
        document.getElementById("filterLabel"),
        () => this.#render(),
      );

      this.#auth = new AuthManager(
        document.getElementById("authControls"),
        document.getElementById("addStudioFormContainer"),
        () => {
          this.#auth.renderUI(() => this.#handleAddStudio());
          this.#render();
        },
      );

      this.#setupEventListeners();
    }

    async init() {
      const data = await fetchData();
      this.#studios = data
        .filter((x) => x.title)
        .map((x) => ({ ...x, tags: x.tags || [] }));
      this.#render();
    }

    #setupEventListeners() {
      this.#searchInput.addEventListener("input", (e) => {
        this.#searchTerm = e.target.value;
        this.#clearSearchBtn.classList.toggle("hidden", !this.#searchTerm);
        this.#render();
      });

      this.#clearSearchBtn.addEventListener("click", () => {
        this.#searchTerm = "";
        this.#searchInput.value = "";
        this.#clearSearchBtn.classList.add("hidden");
        this.#render();
      });

      this.#sortSelect.addEventListener("change", (e) => {
        this.#sortBy = e.target.value;
        this.#render();
      });

      this.#grid.addEventListener("click", (e) => {
        const editBtn = e.target.closest("[data-action='edit']");
        const deleteBtn = e.target.closest("[data-action='delete']");
        const saveBtn = e.target.closest("[data-action='save']");
        const cancelBtn = e.target.closest("[data-action='cancel']");

        if (editBtn) {
          e.preventDefault();
          this.#startEdit(editBtn.dataset.id);
        }
        if (deleteBtn) {
          e.preventDefault();
          this.#deleteStudio(deleteBtn.dataset.id);
        }
        if (saveBtn) this.#saveEdit(saveBtn.dataset.id);
        if (cancelBtn) this.#cancelEdit();
      });
    }

    async #handleAddStudio() {
      const nameInp = document.getElementById("newStudioName");
      const urlInp = document.getElementById("newStudioUrl");
      if (!urlInp.value) return;

      const title =
        nameInp.value ||
        urlInp.value.split("//")[1]?.split(".")[0] ||
        "Studio";
      const url = urlInp.value.startsWith("http")
        ? urlInp.value
        : `https://${urlInp.value}`;
      const tags = ["Added Source"];

      const firestoreId = await addLink(title, url, tags);
      this.#studios.unshift({ id: Date.now(), firestoreId, title, url, tags });
      nameInp.value = "";
      urlInp.value = "";
      this.#render();
    }

    #startEdit(firestoreId) {
      if (!this.#auth.isLoggedIn) return;
      this.#editingId = firestoreId;
      this.#render();
    }

    #cancelEdit() {
      this.#editingId = null;
      this.#render();
    }

    async #saveEdit(firestoreId) {
      if (!this.#auth.isLoggedIn) return;
      const title = document.getElementById("editName").value;
      const url = document.getElementById("editUrl").value;
      const tags = document
        .getElementById("editTags")
        .value.split(",")
        .map((t) => t.trim())
        .filter((t) => t);
      await editLink(firestoreId, title, url, tags);
      this.#studios = this.#studios.map((s) =>
        s.firestoreId === firestoreId ? { ...s, title, url, tags } : s,
      );
      this.#editingId = null;
      this.#render();
    }

    async #deleteStudio(firestoreId) {
      if (!this.#auth.isLoggedIn) return;
      if (!confirm("Remove this studio from the vault?")) return;
      await deleteLink(firestoreId);
      this.#studios = this.#studios.filter(
        (s) => s.firestoreId !== firestoreId,
      );
      this.#render();
    }

    #getFavicon(url) {
      try {
        const domain = new URL(url).hostname;
        return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
      } catch {
        return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==";
      }
    }

    #buildCard(studio) {
      const isEditing =
        this.#auth.isLoggedIn && this.#editingId === studio.firestoreId;
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
              <button data-action="save" data-id="${studio.firestoreId}"
                class="flex-1 bg-custom-blue text-white py-2 rounded-xl text-xs font-bold shadow-lg shadow-blue-100 hover-bg-custom-blue transition-colors">Save</button>
              <button data-action="cancel"
                class="flex-1 bg-stone-100 text-stone-500 py-2 rounded-xl text-xs font-bold hover:bg-stone-200 transition-colors">Cancel</button>
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

        const adminButtons = this.#auth.isLoggedIn
          ? `
            <button data-action="edit" data-id="${studio.firestoreId}"
              class="text-stone-300 hover:text-custom-blue p-1.5 relative z-20 transition-all hover:scale-110" title="Edit Studio">
              <i data-lucide="pencil" class="w-4 h-4"></i>
            </button>
            <button data-action="delete" data-id="${studio.firestoreId}"
              class="text-stone-300 hover:text-red-500 p-1.5 relative z-20 transition-all hover:scale-110" title="Remove from vault">
              <i data-lucide="trash-2" class="w-4 h-4"></i>
            </button>
          `
          : "";

        card.innerHTML = `
          <a href="${studio.url}" target="_blank" class="no-underline h-full flex flex-col justify-between">
            <div class="absolute inset-0 bg-gradient-to-br from-[#0C75DD]/0 to-[#0C75DD]/0 group-hover:from-[#0C75DD]/10 group-hover:to-[#0C75DD]/20 transition-colors duration-500"></div>
            <div class="relative z-10">
              <div class="flex justify-between items-start mb-8">
                <div class="w-14 h-14 rounded-2xl bg-white flex items-center justify-center overflow-hidden border border-stone-100 shadow-sm group-hover:shadow-md group-hover:scale-105 transition-all duration-500">
                  <img src="${this.#getFavicon(studio.url)}" class="w-8 h-8 object-contain">
                </div>
                <div class="flex gap-1 items-center">
                  <div class="opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-custom-blue transform translate-x-2 group-hover:translate-x-0">
                    <i data-lucide="arrow-up-right" class="w-5 h-5"></i>
                  </div>
                  ${adminButtons}
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

      return card;
    }

    #render() {
      let filtered = this.#studios.filter((s) => {
        const matchesSearch =
          s.title.toLowerCase().includes(this.#searchTerm.toLowerCase()) ||
          s.url.toLowerCase().includes(this.#searchTerm.toLowerCase()) ||
          s.tags.some((t) =>
            t.toLowerCase().includes(this.#searchTerm.toLowerCase()),
          );
        const matchesTags =
          this.#filter.selectedTags.length === 0 ||
          this.#filter.selectedTags.some((t) => s.tags.includes(t));
        return matchesSearch && matchesTags;
      });

      if (this.#sortBy === "alpha") {
        filtered.sort((a, b) => a.title.localeCompare(b.title));
      } else {
        filtered.sort((a, b) => b.id - a.id);
      }

      this.#grid.innerHTML = "";
      filtered.forEach((studio) => this.#grid.appendChild(this.#buildCard(studio)));

      lucide.createIcons();

      this.#emptyState.classList.toggle("hidden", filtered.length > 0);
      this.#resultCountText.innerText = `${filtered.length} studios saved`;

      const allTags = Array.from(
        new Set(this.#studios.flatMap((s) => s.tags)),
      ).sort();
      this.#filter.render(allTags);
    }
  }

  // ─── Boot ───────────────────────────────────────────────────────────────────

  const app = new StudioApp();
  await app.init();
})();
