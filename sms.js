const $ = id => document.getElementById(id);

const STORAGE_KEY = "studentHubRecords";

function loadStudents() {
    try {
        const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");

        if (!Array.isArray(data)) return [];

        return data.filter(student =>
            student &&
            Number.isInteger(student.id) &&
            typeof student.name === "string"
        );
    } catch {
        return [];
    }
}

let students = loadStudents();
let editingId = null;
let toastTimer;

function saveStudents() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(students));
        return true;
    } catch (error) {
        showToast("Could not save data. Browser storage may be full.");
        return false;
    }
}

function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

function showToast(message) {
    $("toast").textContent = message;
    $("toast").classList.add("show");

    clearTimeout(toastTimer);

    toastTimer = setTimeout(() => {
        $("toast").classList.remove("show");
    }, 2500);
}

function generateId() {
    const highestId = students.reduce(
        (max, student) => Math.max(max, student.id),
        1000
    );

    return highestId + 1;
}

function updateDashboard() {
    $("totalStudents").textContent = students.length;

    $("totalCourses").textContent =
        new Set(students.map(student => student.course)).size;

    $("totalDepartments").textContent =
        new Set(students.map(student => student.department)).size;
}

function renderStudents() {
    const search = $("searchInput").value.trim().toLowerCase();
    const statusFilter = $("statusFilter").value;

    const filtered = students.filter(student => {
        const matchesSearch = [
            student.id,
            student.name,
            student.email,
            student.phone,
            student.course,
            student.department
        ].some(value =>
            String(value).toLowerCase().includes(search)
        );

        const matchesStatus =
            statusFilter === "All" ||
            student.status === statusFilter;

        return matchesSearch && matchesStatus;
    });

    $("studentTableBody").innerHTML = filtered.map(student => `
        <tr>
            <td class="student-id">STU-${student.id}</td>

            <td class="student-name">
                ${escapeHTML(student.name)}
            </td>

            <td>${escapeHTML(student.email)}</td>

            <td>${escapeHTML(student.course)}</td>

            <td>${escapeHTML(student.department)}</td>

            <td>${escapeHTML(student.year)}</td>

            <td>
                <span class="status ${
                    student.status === "Active" ? "active" : "inactive"
                }">
                    ${escapeHTML(student.status)}
                </span>
            </td>

            <td>
                <div class="action-buttons">
                    <button class="edit-btn"
                            data-action="edit"
                            data-id="${student.id}">
                        ✏️ Edit
                    </button>

                    <button class="delete-btn"
                            data-action="delete"
                            data-id="${student.id}">
                        🗑️ Delete
                    </button>
                </div>
            </td>
        </tr>
    `).join("");

    $("emptyMessage").hidden = filtered.length > 0;

    $("showingCount").textContent =
        `Showing ${filtered.length} of ${students.length} students`;

    updateDashboard();
}

function getFormData() {
    return {
        name: $("studentName").value.trim(),
        email: $("studentEmail").value.trim(),
        phone: $("studentPhone").value.trim(),
        gender: $("studentGender").value,
        course: $("studentCourse").value,
        department: $("studentDepartment").value,
        year: $("studentYear").value,
        status: $("studentStatus").value
    };
}

function resetForm() {
    $("studentFormElement").reset();

    editingId = null;

    $("formTitle").textContent = "Add New Student";
    $("submitBtn").textContent = "➕ Add Student";
    $("cancelEdit").hidden = true;
}

$("studentFormElement").addEventListener("submit", event => {
    event.preventDefault();

    const data = getFormData();

    if (data.name.length < 2) {
        showToast("Please enter a valid full name.");
        return;
    }

    if (!/^[0-9]{10}$/.test(data.phone)) {
        showToast("Enter a valid 10-digit phone number.");
        return;
    }

    const duplicateEmail = students.some(student =>
        student.email.toLowerCase() === data.email.toLowerCase() &&
        student.id !== editingId
    );

    if (duplicateEmail) {
        showToast("This email is already registered.");
        return;
    }

    if (editingId !== null) {
        const index = students.findIndex(
            student => student.id === editingId
        );

        if (index === -1) {
            showToast("Student record was not found.");
            resetForm();
            return;
        }

        students[index] = {
            ...students[index],
            ...data
        };

        if (!saveStudents()) return;

        showToast("Student details updated successfully!");
    } else {
        const newStudent = {
            id: generateId(),
            ...data,
            createdAt: new Date().toISOString()
        };

        students.unshift(newStudent);

        if (!saveStudents()) {
            students.shift();
            return;
        }

        showToast("New student added successfully!");
    }

    resetForm();
    renderStudents();

    $("studentSection").scrollIntoView({ behavior: "smooth" });
});

function editStudent(id) {
    const student = students.find(
        student => student.id === Number(id)
    );

    if (!student) return;

    editingId = student.id;

    $("studentName").value = student.name;
    $("studentEmail").value = student.email;
    $("studentPhone").value = student.phone;
    $("studentGender").value = student.gender;
    $("studentCourse").value = student.course;
    $("studentDepartment").value = student.department;
    $("studentYear").value = student.year;
    $("studentStatus").value = student.status;

    $("formTitle").textContent = "Edit Student Details";
    $("submitBtn").textContent = "💾 Update Student";
    $("cancelEdit").hidden = false;

    $("studentForm").scrollIntoView({ behavior: "smooth" });
}

function deleteStudent(id) {
    const student = students.find(
        student => student.id === Number(id)
    );

    if (!student) return;

    const confirmed = confirm(
        `Are you sure you want to delete ${student.name}?`
    );

    if (!confirmed) return;

    const previousStudents = students;

    students = students.filter(
        student => student.id !== Number(id)
    );

    if (!saveStudents()) {
        students = previousStudents;
        return;
    }

    if (editingId === Number(id)) {
        resetForm();
    }

    renderStudents();
    showToast("Student deleted successfully.");
}

// Handle Edit and Delete buttons.
$("studentTableBody").addEventListener("click", event => {
    const button = event.target.closest("[data-action]");

    if (!button) return;

    const id = Number(button.dataset.id);

    if (button.dataset.action === "edit") {
        editStudent(id);
    }

    if (button.dataset.action === "delete") {
        deleteStudent(id);
    }
});

// Search and status filter.
$("searchInput").addEventListener("input", renderStudents);
$("statusFilter").addEventListener("change", renderStudents);

// Cancel edit.
$("cancelEdit").addEventListener("click", resetForm);

// Export CSV.
$("exportBtn").addEventListener("click", () => {
    if (students.length === 0) {
        showToast("No student records available to export.");
        return;
    }

    const columns = [
        ["Student ID", student => `STU-${student.id}`],
        ["Full Name", student => student.name],
        ["Email", student => student.email],
        ["Phone", student => student.phone],
        ["Gender", student => student.gender],
        ["Course", student => student.course],
        ["Department", student => student.department],
        ["Academic Year", student => student.year],
        ["Status", student => student.status]
    ];

    function csvCell(value) {
        let text = String(value ?? "");

        // Prevent spreadsheet formula injection in text fields.
        if (/^[\s]*[=+\-@]/.test(text)) {
            text = "'" + text;
        }

        return '"' + text.replace(/"/g, '""') + '"';
    }

    const rows = [
        columns.map(column => csvCell(column[0])).join(","),
        ...students.map(student =>
            columns.map(column => csvCell(column[1](student))).join(",")
        )
    ];

    const blob = new Blob(
        ["\uFEFF" + rows.join("\r\n")],
        { type: "text/csv;charset=utf-8;" }
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "student_records.csv";

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);

    showToast("Student data exported to CSV!");
});

// Dark mode.
if (localStorage.getItem("studentHubDark") === "true") {
    document.body.classList.add("dark");
    $("themeBtn").textContent = "☀️";
}

$("themeBtn").addEventListener("click", () => {
    document.body.classList.toggle("dark");

    const isDark = document.body.classList.contains("dark");

    localStorage.setItem("studentHubDark", String(isDark));

    $("themeBtn").textContent = isDark ? "☀️" : "🌙";
});

// First render.
renderStudents();