let token = null;
async function login() {
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value;
    const message = document.getElementById("message");
    if (!username || !password) {
        message.className = "error";
        message.textContent = "Introdueix el nom d'usuari i la contrasenya.";
        return;
    }
    try {
        message.className = "";
        message.textContent = "Iniciant sessió...";
        const response = await fetch("/api/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password })
        });
        const data = await response.json();
        if (!response.ok) {
            message.className = "error";
            message.textContent = data.error || "No s'ha pogut iniciar sessió.";
            return;
        }
        /* * El JWT només es conserva en memòria mentre * aquesta pàgina està oberta. */
        token = data.token; // Amagar login 
        document.getElementById("loginSection").style.display = "none"; // Mostrar eliminació 
        document.getElementById("deleteSection").style.display = "block";
        message.className = ""; message.textContent = "Sessió iniciada correctament.";
    }
    catch (error) {
        console.error(error);
        message.className = "error";
        message.textContent = "No s'ha pogut contactar amb el servidor.";
    }
}
async function deleteAccount() {
    const message = document.getElementById("message");
    if (!token) {
        message.className = "error";
        message.textContent = "Has d'iniciar sessió primer.";
        return;

    }
    const confirmDelete = confirm("ELIMINAR EL COMPTE\n\n"
        + "Aquesta acció eliminarà el teu compte "
        + "i les dades personals associades, "
        + "d'acord amb la política de privacitat.\n\n"
        + "L'acció no es pot desfer.\n\n"
        + "Vols continuar?");
    if (!confirmDelete) {
        return;
    }
    /* * Segona confirmació per reduir el risc * d'eliminació accidental. */
    const finalConfirmation = prompt("Per confirmar l'eliminació, escriu:\n\n" + "ELIMINAR");
    if (finalConfirmation !== "ELIMINAR") {
        message.className = "";
        message.textContent = "Eliminació cancel·lada."; return;
    }
    try {
        message.className = "";
        message.textContent = "Eliminant compte...";
        const response = await fetch("/api/profile", {
            method: "DELETE",
            headers: { "Authorization": "Bearer " + token }
        }
        );
        let data = {};
        try {
            data = await response.json();
        } catch (_) {
            // La resposta pot no contenir JSON. } 
            if (!response.ok) {
                message.className = "error";
                message.textContent = data.error || "No s'ha pogut eliminar el compte.";
                return;
            }
        } /* * El compte s'ha eliminat correctament. * Eliminem també el token de la memòria. */
        token = null;
        document.getElementById("deleteSection").style.display = "none";
        document.getElementById("loginSection").style.display = "none";
        message.className = "success";
        message.textContent = "El teu compte s'ha eliminat correctament.";
    } catch (error) {
        console.error(error);
        message.className = "error";
        message.textContent = "No s'ha pogut contactar amb el servidor.";
    }
} 