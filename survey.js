document.getElementById('feedback-form').addEventListener('submit', function(e) {
    e.preventDefault();
    
    // Package data payload from form inputs
    const feedbackData = {
        student: document.getElementById('student-name').value,
        favoriteGame: document.getElementById('favorite-game').value,
        requestedGenres: Array.from(document.querySelectorAll('input[name="genre"]:checked')).map(el => el.value),
        customIdeas: document.getElementById('game-ideas').value,
        timestamp: new Date().toISOString()
    };

    // Output values locally for debugging / validation
    console.log('Feedback Received:', feedbackData);

    // Flash success message using built-in typography mechanics
    const resultDiv = document.getElementById('result');
    resultDiv.innerText = "DATA SAVED! THANK YOU FOR PLAYING.";
    resultDiv.style.color = "#00ffcc"; // Neon turquoise success accent

    // Reset fields cleanly
    document.getElementById('feedback-form').reset();
});