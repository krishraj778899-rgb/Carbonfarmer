// ========================================
// CarbonReady - Frontend JavaScript
// ========================================

document.addEventListener("DOMContentLoaded", () => {
    console.log("CarbonReady loaded successfully 🌱");

    // Mobile Menu
    const menuBtn = document.querySelector(".menu-btn");
    const navLinks = document.querySelector(".nav-links");

    if (menuBtn && navLinks) {
        menuBtn.addEventListener("click", () => {
            navLinks.classList.toggle("active");
        });
    }

    // Smooth Scroll
    document.querySelectorAll('a[href^="#"]').forEach(link => {
        link.addEventListener("click", function (e) {
            const targetId = this.getAttribute("href");

            if (targetId === "#") return;

            const target = document.querySelector(targetId);

            if (target) {
                e.preventDefault();

                target.scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });
            }
        });
    });

    // Get Started buttons
    document.querySelectorAll(".get-started-btn").forEach(button => {
        button.addEventListener("click", () => {
            window.location.href = "register.html";
        });
    });

    // Login buttons
    document.querySelectorAll(".login-btn").forEach(button => {
        button.addEventListener("click", () => {
            window.location.href = "login.html";
        });
    });
});


// ========================================
// API Helper
// ========================================

async function apiRequest(url, options = {}) {
    try {
        const response = await fetch(url, {
            headers: {
                "Content-Type": "application/json",
                ...(options.headers || {})
            },
            ...options
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "Something went wrong");
        }

        return data;

    } catch (error) {
        console.error("API Error:", error);
        throw error;
    }
}


// ========================================
// Register User
// ========================================

async function registerUser(name, email, password) {

    try {

        const data = await apiRequest("/api/register", {
            method: "POST",
            body: JSON.stringify({
                name,
                email,
                password
            })
        });

        alert(data.message || "Registration successful!");

        window.location.href = "login.html";

    } catch (error) {

        alert(error.message);

    }
}


// ========================================
// Login User
// ========================================

async function loginUser(email, password) {

    try {

        const data = await apiRequest("/api/login", {
            method: "POST",
            body: JSON.stringify({
                email,
                password
            })
        });

        // Save login token
        localStorage.setItem("carbonReadyToken", data.token);

        // Save user information
        if (data.user) {
            localStorage.setItem(
                "carbonReadyUser",
                JSON.stringify(data.user)
            );
        }

        alert("Login successful!");

        window.location.href = "dashboard.html";

    } catch (error) {

        alert(error.message);

    }
}


// ========================================
// Logout
// ========================================

function logoutUser() {

    localStorage.removeItem("carbonReadyToken");
    localStorage.removeItem("carbonReadyUser");

    window.location.href = "index.html";
}


// ========================================
// Check Login
// ========================================

function isLoggedIn() {

    return !!localStorage.getItem("carbonReadyToken");

}


// ========================================
// Get Logged-in User
// ========================================

function getCurrentUser() {

    const user = localStorage.getItem("carbonReadyUser");

    if (!user) {
        return null;
    }

    try {
        return JSON.parse(user);
    } catch (error) {
        return null;
    }

}


// ========================================
// Protect Dashboard Pages
// ========================================

function requireLogin() {

    if (!isLoggedIn()) {

        alert("Please login first.");

        window.location.href = "login.html";

    }

}


// ========================================
// Save Farm Assessment
// ========================================

async function submitAssessment(assessmentData) {

    try {

        const token = localStorage.getItem("carbonReadyToken");

        if (!token) {
            alert("Please login first.");
            window.location.href = "login.html";
            return;
        }

        const data = await apiRequest("/api/assessment", {

            method: "POST",

            headers: {
                Authorization: `Bearer ${token}`
            },

            body: JSON.stringify(assessmentData)

        });

        return data;

    } catch (error) {

        alert(error.message);

    }

}


// ========================================
// API Health Check
// ========================================

async function checkServer() {

    try {

        const response = await fetch("/api/health");

        const data = await response.json();

        console.log("Server Status:", data);

    } catch (error) {

        console.error("Backend server is not running.");

    }

}