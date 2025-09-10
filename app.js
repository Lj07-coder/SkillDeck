import { auth, db } from "./firebase-config.js";
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js";

import { 
  collection, addDoc, getDocs, doc, setDoc, updateDoc, deleteDoc, getDoc
} from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";

console.log("app.js loaded ✅");

// --- CLOUDINARY CONFIG ---
const CLOUD_NAME = "dowjw1vrs";
const UPLOAD_PRESET = "hackathon_upload";

let editingProjectId = null; // Track if editing

// --- Upload image to Cloudinary ---
async function uploadImageToCloudinary(file) {
  if (!file) return "";
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`, {
    method: "POST",
    body: formData
  });

  const data = await res.json();
  return data.secure_url || "";
}
// --- Save Profile Photo ---
async function saveProfilePhoto() {
  const user = auth.currentUser;
  if (!user) {
    alert("Please login first.");
    return;
  }

  const fileInput = document.getElementById("profilePhoto");
  if (fileInput && fileInput.files.length > 0) {
    try {
      const imageUrl = await uploadImageToCloudinary(fileInput.files[0]);
      const userDocRef = doc(db, "users", user.uid);
      await setDoc(userDocRef, { profilePhotoUrl: imageUrl }, { merge: true });
      alert("Profile photo updated!");
      loadMyProjects();
      loadOthersPortfolios();
    } catch (err) {
      console.error(err);
      alert("Error uploading profile photo.");
    }
  } else {
    alert("Please choose a photo first.");
  }
}
// --- Save Portfolio Achievements ---
async function savePortfolioAchievements() {
  const user = auth.currentUser;
  if (!user) {
    alert("Please login first.");
    return;
  }

  const achievements = document.getElementById("portfolioAchievements").value.trim();
  try {
    const userDocRef = doc(db, "users", user.uid);
    await setDoc(userDocRef, { achievements }, { merge: true });
    alert("Achievements updated!");
    loadMyProjects();
    loadOthersPortfolios();
  } catch (err) {
    console.error(err);
    alert("Error saving achievements.");
  }
}

// --- Save Resume ---
async function saveResume() {
  const user = auth.currentUser;
  if (!user) {
    alert("Please login first.");
    return;
  }

  const fileInput = document.getElementById("resumeFile");
  if (fileInput && fileInput.files.length > 0) {
    try {
      const formData = new FormData();
      formData.append("file", fileInput.files[0]);
      formData.append("upload_preset", UPLOAD_PRESET);

      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`,
        { method: "POST", body: formData }
      );

      const data = await res.json();
      const resumeUrl = data.secure_url || "";

      const userDocRef = doc(db, "users", user.uid);
      await setDoc(userDocRef, { resumeUrl }, { merge: true });

      alert("Resume uploaded!");
      loadMyProjects();
      loadOthersPortfolios();
    } catch (err) {
      console.error(err);
      alert("Error uploading resume.");
    }
  } else {
    alert("Please choose a file first.");
  }
}

// --- Signup ---
async function signup(e) {
  e.preventDefault();
  const firstName = document.getElementById("signupFirstName").value.trim();
  const lastName = document.getElementById("signupLastName").value.trim();
  const email = document.getElementById("signupEmail").value.trim();
  const password = document.getElementById("signupPassword").value;

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Save user info
    const userDocRef = doc(db, "users", user.uid);
    await setDoc(userDocRef, { firstName, lastName, email }, { merge: true });

    alert("Signed up as " + firstName + " " + lastName);
  } catch (error) {
    alert(error.message);
  }
}

// --- Login ---
async function login(e) {
  e.preventDefault();
  const email = document.getElementById("loginEmail").value;
  const password = document.getElementById("loginPassword").value;

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    alert("Logged in as " + userCredential.user.email);
    loadMyProjects();
  } catch (error) {
    alert(error.message);
  }
}

// --- Logout ---
async function logout() {
  try {
    await signOut(auth);
    alert("Logged out");
  } catch (error) {
    alert(error.message);
  }
}

// --- Add or Update Project ---
async function addProject(e) {
  e.preventDefault();

  const title = document.getElementById("projectTitle").value.trim();
  const description = document.getElementById("projectDesc").value.trim();
  const phone = document.getElementById("projectPhone").value.trim();
  const workEmail = document.getElementById("projectWorkEmail").value.trim();
  const technologies = document.getElementById("projectTech").value.trim();
  const skills = portfolioSkills; // from tag system
  const completionDate = document.getElementById("completionDate").value || "";
  const projectTypes = Array.from(
    document.querySelectorAll("input[name='projectType']:checked")
  ).map(cb => cb.value);
  const link = document.getElementById("projectLink").value.trim();

  const file = document.getElementById("projectFile").files[0];
  let imageUrl = "";

  try {
    // 🔹 Upload file to Cloudinary if chosen
    if (file) {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", UPLOAD_PRESET);

      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await res.json();
      imageUrl = data.secure_url || "";
    }

    // 🔹 Check if editing or adding
    const projectId = document.getElementById("projectForm").dataset.editingId;
    if (projectId) {
      // update existing project
      const projectRef = doc(
        db,
        "users",
        auth.currentUser.uid,
        "projects",
        projectId
      );
      await updateDoc(projectRef, {
        title,
        description,
        phone,
        workEmail,
        technologies,
        skills,
        completionDate,
        projectTypes,
        link,
        ...(imageUrl && { imageUrl }),
      });
      delete document.getElementById("projectForm").dataset.editingId;
    } else {
      // add new project
      await addDoc(collection(db, "users", auth.currentUser.uid, "projects"), {
        title,
        description,
        phone,
        workEmail,
        technologies,
        skills,
        completionDate,
        projectTypes,
        link,
        imageUrl,
        createdAt: new Date(),
      });
    }

    // 🔹 Reset form + reload
    document.getElementById("projectForm").reset();
    portfolioSkills = [];
    renderSkillTags();
    loadMyProjects();
    loadOthersPortfolios();

  } catch (error) {
    console.error(error);
    alert(error.message);
  }
}
// --- Load My Projects (supports #yourProjectsList OR legacy #projectList) ---
async function loadMyProjects() {
  const myProjectsDiv = document.getElementById("yourProjectsList") || document.getElementById("projectList");
  if (!myProjectsDiv) return;

  myProjectsDiv.innerHTML = "Loading...";

  try {
    const user = auth.currentUser;
    if (!user) {
      myProjectsDiv.innerHTML = "Login to see your projects.";
      return;
    }

    // 🔹 Fetch user data to get profile photo
    const userDocSnap = await getDoc(doc(db, "users", user.uid));
    const userData = userDocSnap.exists() ? userDocSnap.data() : {};
    const profilePhotoUrl = userData.profilePhotoUrl || "";

    let html = "";

    // 🔹 Add profile photo on top (if exists)
    if (profilePhotoUrl) {
      html += `
        <div style="text-align:center; margin-bottom:15px;">
          <img src="${profilePhotoUrl}" 
               alt="Profile Photo" 
               style="width:120px; height:120px; object-fit:cover; border-radius:50%; border:2px solid #ccc;" />
        </div>
      `;
    }

    // 🔹 Load all projects
    const projectsSnap = await getDocs(collection(db, "users", user.uid, "projects"));

    projectsSnap.forEach((proj) => {
      const p = proj.data();
      html += `
        <div class="my-project-card" style="border:1px solid #ccc; padding:10px; margin:10px; border-radius:6px; background:#fafafa;">
          <p><b>${p.title || "Untitled Project"}</b></p>
          <p>${p.description || ""}</p>
          ${p.imageUrl ? `<img src="${p.imageUrl}" style="width:96px; height:96px; object-fit:cover; border-radius:6px; margin:6px 0;" />` : ""}
          <div style="margin-top:6px;">
            <button onclick='editProject("${proj.id}", ${JSON.stringify(p).replace(/"/g, '&quot;')})'>Edit</button>
            <button onclick='deleteProject("${proj.id}")' style="background:#c62828; margin-left:10px;">Delete</button>
          </div>
        </div>
      `;
    });

    myProjectsDiv.innerHTML = html || "No projects yet.";

  } catch (err) {
    console.error(err);
    myProjectsDiv.innerHTML = "Error loading projects.";
  }
}


// --- Edit Project ---
window.editProject = function (projectId, projectData) {
  editingProjectId = projectId;

  // Prefill form fields
  document.getElementById("projectTitle").value = projectData.title || "";
  document.getElementById("projectDesc").value = projectData.description || "";
  document.getElementById("projectPhone").value = projectData.phone || "";
  document.getElementById("projectWorkEmail").value = projectData.workEmail || "";
  document.getElementById("projectTech").value = projectData.technologies || "";
  document.getElementById("completionDate").value = projectData.completionDate || "";
  document.getElementById("projectLink").value = projectData.link || "";

  // ✅ Load skills into tag input
  portfolioSkills = Array.isArray(projectData.skills) 
    ? projectData.skills 
    : (projectData.skills ? projectData.skills.split(",").map(s => s.trim()) : []);
  renderSkillTags();

  // Reset checkboxes
  document.querySelectorAll("input[name='projectType']").forEach(cb => {
    cb.checked = projectData.projectTypes?.includes(cb.value) || false;
  });

  alert("Editing project: " + (projectData.title || "Untitled"));
};

// --- Delete Project ---
window.deleteProject = async function (projectId) {
  if (!confirm("Are you sure you want to delete this project?")) return;

  try {
    const user = auth.currentUser;
    if (!user) {
      alert("Please login first.");
      return;
    }

    const projectRef = doc(db, "users", user.uid, "projects", projectId);
    await deleteDoc(projectRef);

    alert("Project deleted!");
    loadMyProjects();
    loadOthersPortfolios();
  } catch (err) {
    console.error(err);
    alert("Error deleting project.");
  }
};

async function populateSkillFilters() {
  const usersSnap = await getDocs(collection(db, "users"));
  const allSkills = new Set();

  for (let userDocSnap of usersSnap.docs) {
    const userId = userDocSnap.id;
    const projectsSnap = await getDocs(collection(db, "users", userId, "projects"));

    projectsSnap.forEach(doc => {
      const rawSkills = doc.data().skills;
      const skills = Array.isArray(rawSkills)
        ? rawSkills
        : (rawSkills || "").split(",");
      skills.map(s => s.trim()).filter(Boolean).forEach(s => allSkills.add(s));
    });
  }

  // Build checkboxes
  const skillsFilterDiv = document.getElementById("skillsFilter");
  skillsFilterDiv.innerHTML = Array.from(allSkills).sort().map(skill => `
    <label style="display:inline-flex; align-items:center; gap:4px;">
      <input type="checkbox" value="${skill}" />
      ${skill}
    </label>
  `).join("");
}
// --- Load Others' Portfolios (cards per project, double-click opens ALL projects for that user) ---
async function loadOthersPortfolios(selectedSkills = []) {
  const othersList = document.getElementById("othersList");
  if (!othersList) return;
  othersList.innerHTML = "Loading...";

  try {
    const usersSnap = await getDocs(collection(db, "users"));
    let results = [];

    for (let userDocSnap of usersSnap.docs) {
      const userId = userDocSnap.id;
      const userData = userDocSnap.data();
      const projectsSnap = await getDocs(collection(db, "users", userId, "projects"));
      if (projectsSnap.empty) continue;

      // Collect user skills
      const allSkills = Array.from(new Set(
        projectsSnap.docs
          .map(doc => {
            const rawSkills = doc.data().skills;
            return Array.isArray(rawSkills)
              ? rawSkills
              : (rawSkills || "").split(",");
          })
          .flat()
          .map(s => s.trim())
          .filter(Boolean)
      ));

      // Relevance score: higher = better match
      let score = 0;
      if (selectedSkills.length) {
        const matches = selectedSkills.filter(s => allSkills.includes(s)).length;
        score = matches === selectedSkills.length ? 2 : (matches > 0 ? 1 : 0);
        if (score === 0) continue; // skip if no match at all
      }

      results.push({ userId, userData, projectsSnap, allSkills, score });
    }

    // Sort by score (2 → 1 → 0)
    results.sort((a, b) => b.score - a.score);

    // Render
    let html = "";
    for (let r of results) {
      const profilePhotoUrl = r.userData.profilePhotoUrl || "";
      const firstProj = r.projectsSnap.docs[0].data();
      const fullName = r.userData.firstName 
        ? `${r.userData.firstName} ${r.userData.lastName || ""}`.trim()
        : r.userData.email || "N/A";

      html += `
        <div class="portfolio-card" 
             ondblclick='expandPortfolio("${r.userId}")'
             style="border:1px solid #ccc; padding:10px; margin:10px; border-radius:8px; background:#fff; cursor:pointer;">
          ${profilePhotoUrl 
            ? `<img src="${profilePhotoUrl}" class="passport" alt="Profile Photo" />` 
            : ""}
          <p><b>Name:</b> ${fullName}</p>
          <p><b>Email:</b> ${firstProj.workEmail || "N/A"}</p>
          <p><b>Skills:</b> ${r.allSkills.join(", ")}</p>
          <p><em>${r.projectsSnap.size} project(s)</em></p>
          <p class="small-help">Double-click to view all projects</p>
        </div>
      `;
    }

    othersList.innerHTML = html || "No portfolios found.";

  } catch (err) {
    console.error(err);
    othersList.innerHTML = "Error loading portfolios.";
  }
}
// 3. hook filter button 
document.getElementById("applyFilterBtn").addEventListener("click", () => {
  const selectedSkills = Array.from(
    document.querySelectorAll("#skillsFilterOptions input:checked")
  ).map(cb => cb.value);

  loadOthersPortfolios(selectedSkills);
});

// 4. run both on page load
window.addEventListener("DOMContentLoaded", async () => {
  await populateSkillFilters();
  await loadOthersPortfolios();
});


// --- Expand Portfolio: fetch ALL projects for the user and show in modal ---
// --- Expand Portfolio: fetch ALL projects for the user and show in modal ---
window.expandPortfolio = async function(userId) {
  try {
    // Fetch user info
    const userDocRef = doc(db, "users", userId);
    const userDocSnap = await getDoc(userDocRef);
    const userData = userDocSnap.exists() ? userDocSnap.data() : {};
    const fullName = userData.firstName 
      ? `${userData.firstName} ${userData.lastName || ""}`.trim()
      : userData.email || "N/A";

    // Fetch all projects of this user
    const projectsSnap = await getDocs(collection(db, "users", userId, "projects"));
    const projects = projectsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    // 🔹 Profile photo OR fallback to first project image
    const profilePhotoUrl = userData.profilePhotoUrl || "";
    const firstWithImage = projects.find(p => p.imageUrl);
    const topImage = profilePhotoUrl || firstWithImage?.imageUrl || "";

    // Contact info
    const primaryPhone = projects.find(p => p.phone)?.phone || "N/A";
    const primaryEmail = projects.find(p => p.workEmail)?.workEmail || "N/A";

    // 🔹 Collect unique skills (safe: array or string)
    const allSkills = Array.from(new Set(
      projects
        .map(p => {
          const rawSkills = p.skills;
          return Array.isArray(rawSkills)
            ? rawSkills
            : (rawSkills || "").split(",");
        })
        .flat()
        .map(s => s.trim())
        .filter(Boolean)
    ));
    const skillsStr = allSkills.length ? allSkills.join(", ") : "N/A";

    // Collect achievements
    const allAchievements = projects
      .map(p => p.achievements)
      .filter(a => (a || "").trim().length > 0);

    // Build projects UI
    const projectsHtml = projects.length
      ? projects.map(p => {
          const types = (p.projectTypes || []).join(", ") || "N/A";
          const tech = p.technologies || "N/A";
          const cdate = p.completionDate || "N/A";
          const link = p.link ? `<a href="${p.link}" target="_blank" rel="noopener">Open Project</a>` : "N/A";
          const desc = p.description || "";
          return `
            <details style="margin:8px 0; border:1px solid #eee; border-radius:8px; padding:8px;">
              <summary style="cursor:pointer; font-weight:700;">${p.title || "Untitled Project"}</summary>
              ${p.imageUrl ? `<img src="${p.imageUrl}" style="width:120px; height:120px; object-fit:cover; border-radius:8px; margin:8px 0;" />` : ""}
              ${desc ? `<p><b>Description:</b> ${desc}</p>` : ""}
              <p><b>Technologies:</b> ${tech}</p>
              <p><b>Type:</b> ${types}</p>
              <p><b>Completion Date:</b> ${cdate}</p>
              <p><b>Project Link:</b> ${link}</p>
            </details>
          `;
        }).join("")
      : "<p>No projects to show.</p>";

    // Modal shell
    const modal = document.createElement("div");
    modal.style.position = "fixed";
    modal.style.top = "0";
    modal.style.left = "0";
    modal.style.width = "100%";
    modal.style.height = "100%";
    modal.style.background = "rgba(0,0,0,0.7)";
    modal.style.display = "flex";
    modal.style.justifyContent = "center";
    modal.style.alignItems = "center";
    modal.style.zIndex = "1000";

    modal.innerHTML = `
      <div style="background:white; padding:20px; border-radius:10px; max-width:820px; width:94%; max-height:84vh; overflow-y:auto; position:relative;">
        <span style="position:absolute; top:10px; right:15px; cursor:pointer; font-size:20px;" onclick="this.parentElement.parentElement.remove()">✖</span>
        ${topImage ? `<img src="${topImage}" style="width:140px; height:170px; object-fit:cover; border-radius:8px; display:block; margin:8px auto 14px;" />` : ""}
        <h2 style="margin:0 0 6px;">${fullName}</h2>
        <p style="margin:4px 0;"><b>Phone:</b> ${primaryPhone}</p>
        <p style="margin:4px 0;"><b>Email:</b> ${primaryEmail}</p>
        <p style="margin:6px 0;"><b>Skills:</b> ${skillsStr}</p>
        ${allAchievements.length ? `
          <div style="margin:10px 0;">
            <b>Achievements:</b>
            <ul style="margin:6px 0 0 18px;">
              ${allAchievements.map(a => `<li>${a}</li>`).join("")}
            </ul>
          </div>` : ""
        }

        <hr style="margin:14px 0;">
        <h3 style="margin:0 0 8px;">Projects</h3>
        ${projectsHtml}
      </div>
    `;

    document.body.appendChild(modal);
  } catch (err) {
    console.error(err);
    alert("Failed to load portfolio.");
  }
};

// =============================
// SKILL TAG INPUT WITH AUTOCOMPLETE
// =============================
let portfolioSkills = [];

// Some example skills — you can expand this list
const allSkills = [
  // --- Programming Languages ---
  "Java", "JavaScript", "TypeScript", "Python", "C", "C++", "C#", "Go", "Rust",
  "Kotlin", "Swift", "PHP", "Ruby", "Perl", "Scala", "R", "MATLAB", "Dart",

  // --- Web Development ---
  "HTML", "CSS", "Sass", "TailwindCSS", "Bootstrap", "Material UI", "Chakra UI",
  "jQuery", "Next.js", "Nuxt.js", "Gatsby",

  // --- Frontend Frameworks ---
  "React", "Angular", "Vue", "Svelte", "SolidJS", "AlpineJS",

  // --- Backend Frameworks ---
  "Node.js", "Express", "NestJS", "Django", "Flask", "Spring", "Laravel",
  "CodeIgniter", "Ruby on Rails", "ASP.NET Core", "FastAPI", "Hapi.js",

  // --- Databases ---
  "MySQL", "PostgreSQL", "SQLite", "MariaDB", "OracleDB", "MongoDB",
  "Cassandra", "Redis", "Firebase Firestore", "DynamoDB", "Neo4j",

  // --- Mobile Development ---
  "Android", "iOS", "React Native", "Flutter", "Ionic", "Xamarin",

  // --- Cloud & DevOps ---
  "AWS", "Azure", "Google Cloud", "Firebase", "Heroku", "Netlify", "Vercel",
  "Docker", "Kubernetes", "Jenkins", "Terraform", "GitHub Actions", "CI/CD",

  // --- Version Control & Collaboration ---
  "Git", "GitHub", "GitLab", "Bitbucket",

  // --- AI & Machine Learning ---
  "Machine Learning", "Deep Learning", "Artificial Intelligence", "Data Science",
  "TensorFlow", "PyTorch", "Keras", "Scikit-learn", "NLTK", "OpenCV", "Pandas",
  "NumPy", "Matplotlib", "Hugging Face", "LangChain",

  // --- Data & Big Data ---
  "Hadoop", "Spark", "Kafka", "Elasticsearch", "Tableau", "Power BI",

  // --- Cybersecurity ---
  "Ethical Hacking", "Penetration Testing", "Cybersecurity", "Cryptography",
  "Network Security", "Blockchain", "Solidity", "Web3.js", "Ethers.js",

  // --- Testing ---
  "Jest", "Mocha", "Chai", "Cypress", "Selenium", "JUnit", "PyTest",

  // --- Other Tools ---
  "Figma", "Canva", "Adobe XD", "Photoshop", "Illustrator", "Blender",
  "Unity", "Unreal Engine", "WordPress", "Shopify", "WooCommerce"
];

const skillsInput = document.getElementById("skillsInput");
const skillsInputWrapper = document.getElementById("skillsInputWrapper");

// Create a container for suggestions
const suggestionBox = document.createElement("div");
suggestionBox.style.cssText = `
  position:absolute;
  background:white;
  border:1px solid #ccc;
  border-radius:6px;
  max-height:150px;
  overflow-y:auto;
  z-index:1000;
`;
suggestionBox.hidden = true;
skillsInputWrapper.style.position = "relative";
skillsInputWrapper.appendChild(suggestionBox);

// --- Show suggestions as user types ---
skillsInput.addEventListener("input", function () {
  const query = skillsInput.value.toLowerCase().trim();
  suggestionBox.innerHTML = "";
  if (!query) {
    suggestionBox.hidden = true;
    return;
  }

  const matches = allSkills.filter(skill => 
    skill.toLowerCase().startsWith(query) && !portfolioSkills.includes(skill)
  );

  if (matches.length === 0) {
    suggestionBox.hidden = true;
    return;
  }

  matches.forEach(skill => {
    const option = document.createElement("div");
    option.textContent = skill;
    option.style.cssText = "padding:6px; cursor:pointer;";
    option.onmouseenter = () => option.style.background = "#eee";
    option.onmouseleave = () => option.style.background = "white";
    option.onclick = () => {
      addSkill(skill);
      skillsInput.value = "";
      suggestionBox.hidden = true;
    };
    suggestionBox.appendChild(option);
  });

  suggestionBox.hidden = false;
});

// --- Add skill manually on Enter / Comma / Space ---
skillsInput.addEventListener("keydown", function (e) {
  if (e.key === "Enter" || e.key === "," || e.key === " ") {
    e.preventDefault();
    const value = skillsInput.value.trim();
    if (value) {
      addSkill(value);
    }
    skillsInput.value = "";
    suggestionBox.hidden = true;
  }
});

// --- Add a skill to tags ---
function addSkill(skill) {
  if (portfolioSkills.includes(skill)) return;
  portfolioSkills.push(skill);
  renderSkillTags();
}

// --- Render skill tags ---
function renderSkillTags() {
  skillsInputWrapper.querySelectorAll(".skill-tag").forEach(el => el.remove());

  portfolioSkills.forEach((skill, index) => {
    const tag = document.createElement("span");
    tag.className = "skill-tag";
    tag.textContent = skill;

    tag.style.cssText = `
      background:#1976d2;
      color:white;
      padding:4px 8px;
      border-radius:12px;
      display:flex;
      align-items:center;
      gap:6px;
      font-size:13px;
      margin:2px;
    `;

    const removeBtn = document.createElement("span");
    removeBtn.textContent = "✖";
    removeBtn.style.cssText = "cursor:pointer; font-size:12px;";
    removeBtn.onclick = () => {
      portfolioSkills.splice(index, 1);
      renderSkillTags();
    };

    tag.appendChild(removeBtn);
    skillsInputWrapper.insertBefore(tag, skillsInput);
  });
}


// --- Auth State Change ---
onAuthStateChanged(auth, (user) => {
  if (user) {
    // Logged in → show dashboard
    document.getElementById("authSection").style.display = "none";
    document.getElementById("dashboardSection").style.display = "block";
    document.getElementById("portfolioSection").style.display = "none";
    document.getElementById("othersSection").style.display = "none";

    loadMyProjects();
  } else {
    // Logged out → show login/signup
    document.getElementById("authSection").style.display = "block";
    document.getElementById("dashboardSection").style.display = "none";
    document.getElementById("portfolioSection").style.display = "none";
    document.getElementById("othersSection").style.display = "none";
  }
});
// 🔥 Expose functions so HTML inline onclick works
window.logout = logout;
window.saveProfilePhoto = saveProfilePhoto;
window.addProject = addProject;
window.signup = signup;
window.login = login;
window.savePortfolioAchievements = savePortfolioAchievements;
window.saveResume = saveResume;
// --- Dashboard Navigation ---
document.getElementById("createPortfolioBtn").addEventListener("click", () => {
  document.getElementById("dashboardSection").style.display = "none";
  document.getElementById("portfolioSection").style.display = "block";
  document.getElementById("othersSection").style.display = "none";
});

document.getElementById("viewPortfoliosBtn").addEventListener("click", () => {
  document.getElementById("dashboardSection").style.display = "none";
  document.getElementById("portfolioSection").style.display = "none";
  document.getElementById("othersSection").style.display = "block";
  loadOthersPortfolios();
});

document.getElementById("backFromPortfolioBtn").addEventListener("click", () => {
  document.getElementById("portfolioSection").style.display = "none";
  document.getElementById("dashboardSection").style.display = "block";
});

document.getElementById("backFromOthersBtn").addEventListener("click", () => {
  document.getElementById("othersSection").style.display = "none";
  document.getElementById("dashboardSection").style.display = "block";
});
