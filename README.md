# PAX Client Portal

A modern, secure, and AI-ready claims management portal built with a powerful tech stack featuring Next.js, FastAPI, and Clerk for authentication.

<br/>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" alt="Next.js"/>
  <img src="https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI"/>
  <img src="https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python"/>
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript"/>
  <img src="https://img.shields.io/badge/Clerk-6C47FF?style=for-the-badge&logo=clerk&logoColor=white" alt="Clerk"/>
  <img src="https://img.shields.io/badge/Supabase-3FCF8E?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase"/>
  <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS"/>
</p>

---

## 🌟 Core Features

-   **Secure Authentication**: Robust user sign-up, sign-in, and session management powered by **Clerk**.
-   **Claims Dashboard**: A central hub to view and track the real-time status of all refund claims.
-   **Advanced File Management**: A desktop-like file explorer for each claim, featuring:
    -   Drag-and-drop file uploads.
    -   Folder creation and organization.
    -   Document status tracking (Validated, Processing, Error).
    -   Breadcrumb navigation and an intuitive interface.
-   **Claim Templates**: Quickly start new claims using predefined templates like "Returned Goods" or "Manufacturing Drawback".
-   **User Settings**: A dedicated space for users to manage their profile and account details.
-   **Responsive Design**: A seamless experience across desktop, tablet, and mobile devices.

## 🛠 Technology Stack

| Area      | Technology                                                              |
| :-------- | :---------------------------------------------------------------------- |
| **Frontend**  | **Next.js** (React), **TypeScript**, **Tailwind CSS**, **shadcn/ui**      |
| **Backend**   | **FastAPI** (Python), **SQLModel**, **Pydantic**                        |
| **Database**  | **Supabase** (PostgreSQL)                                               |
| **Auth**      | **Clerk** (User management and JWT authentication)                      |
| **Data Fetching** | **SWR** (Client-side data fetching and caching)                         |

## 🚀 Getting Started

### Prerequisites

-   Node.js (v18 or newer)
-   Python (v3.8 or newer)
-   `pip` for Python package installation
-   `npm` or `yarn` for Node.js package installation

### Installation & Setup

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd pax-client-portal
    ```

2.  **Set up the Backend:**
    ```bash
    cd backend

    # Install dependencies
    pip install -r requirements.txt

    # Create and configure your environment file
    # (Copy env_template.txt to .env and fill in your keys)
    cp env_template.txt .env

    # Run the server
    python main.py
    ```
    The backend will be running at `http://localhost:8000`.

3.  **Set up the Frontend:**
    ```bash
    cd ../frontend

    # Install dependencies
    npm install

    # Create and configure your local environment file
    # (Copy .env.local.example to .env.local and fill in your keys)
    cp .env.local.example .env.local

    # Run the development server
    npm run dev
    ```
    The frontend will be running at `http://localhost:3000`.

## 🔮 Future Enhancements

-   **File Previews**: Implement in-browser viewing for PDFs and images.
-   **Real-time Notifications**: Add WebSocket-based notifications for status updates.
-   **Advanced Search**: Introduce full-text search across all documents and claims.
-   **Analytics Dashboard**: Provide detailed reporting and insights on claim data.

---
*This project was built for Pax AI's demo.*