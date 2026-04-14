document.addEventListener('DOMContentLoaded', () => {
    // Navigation handling
    const navLinks = document.querySelectorAll('.nav-links a');
    const sections = {
        'predictor': document.getElementById('predictor'),
        'simulator': document.getElementById('simulator')
    };

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            // Remove active classes
            navLinks.forEach(l => l.classList.remove('active'));
            // Add active to clicked
            link.classList.add('active');
            
            // Switch sections
            const targetId = link.getAttribute('href').substring(1);
            Object.keys(sections).forEach(id => {
                if(id === targetId) {
                    sections[id].style.display = 'block';
                    sections[id].classList.remove('fade-in');
                    void sections[id].offsetWidth; // trigger reflow
                    sections[id].classList.add('fade-in');
                } else {
                    sections[id].style.display = 'none';
                }
            });
        });
    });

    // Match Prediction Form Handling
    const form = document.getElementById('prediction-form');
    const resultContainer = document.getElementById('prediction-result');
    const validateSameTeam = () => {
        const t1 = document.getElementById('team1').value;
        const t2 = document.getElementById('team2').value;
        if (t1 && t2 && t1 === t2) {
            alert("Team 1 and Team 2 cannot be the same!");
            return false;
        }
        return true;
    }

    // Update Dynamic Options (Toss and Venue)
    const team1Select = document.getElementById('team1');
    const team2Select = document.getElementById('team2');
    const tossWinnerSelect = document.getElementById('toss_winner');
    const venueSelect = document.getElementById('venue');

    // Store original venue options safely
    const originalVenues = Array.from(venueSelect.options)
        .map(opt => ({ value: opt.value, text: opt.textContent }))
        .filter(opt => opt.value !== "");

    const homeVenuesMap = {
        'Chennai Super Kings': 'MA Chidambaram Stadium, Chepauk, Chennai',
        'Delhi Capitals': 'Arun Jaitley Stadium, Delhi',
        'Gujarat Titans': 'Narendra Modi Stadium, Ahmedabad',
        'Kolkata Knight Riders': 'Eden Gardens, Kolkata',
        'Lucknow Super Giants': 'Bharat Ratna Shri Atal Bihari Vajpayee Ekana Cricket Stadium, Lucknow',
        'Mumbai Indians': 'Wankhede Stadium, Mumbai',
        'Punjab Kings': 'Punjab Cricket Association IS Bindra Stadium, Mohali',
        'Rajasthan Royals': 'Sawai Mansingh Stadium, Jaipur',
        'Royal Challengers Bengaluru': 'M Chinnaswamy Stadium, Bengaluru',
        'Sunrisers Hyderabad': 'Rajiv Gandhi International Stadium, Uppal, Hyderabad'
    };

    const updateDynamicOptions = () => {
        const t1 = team1Select.value;
        const t2 = team2Select.value;
        
        // --- 1. Update Toss Winner ---
        const currentTossWinner = tossWinnerSelect.value;
        tossWinnerSelect.innerHTML = '<option value="" disabled selected>Select Toss Winner</option>';
        
        if (t1) {
            const opt1 = document.createElement('option');
            opt1.value = t1;
            opt1.textContent = t1;
            tossWinnerSelect.appendChild(opt1);
        }
        
        if (t2 && t2 !== t1) {
            const opt2 = document.createElement('option');
            opt2.value = t2;
            opt2.textContent = t2;
            tossWinnerSelect.appendChild(opt2);
        }

        if (currentTossWinner === t1 || currentTossWinner === t2) {
            tossWinnerSelect.value = currentTossWinner;
        }

        // --- 2. Update Venue (Home Stadium Priority) ---
        const currentVenue = venueSelect.value;
        venueSelect.innerHTML = '<option value="" disabled selected>Select Venue</option>';
        
        const priorityVenues = [];
        if (t1 && homeVenuesMap[t1]) priorityVenues.push({ team: t1, venue: homeVenuesMap[t1] });
        if (t2 && homeVenuesMap[t2]) priorityVenues.push({ team: t2, venue: homeVenuesMap[t2] });

        // Add Priority Venues First
        priorityVenues.forEach(pv => {
            const matchingOpt = originalVenues.find(v => v.value === pv.venue);
            if (matchingOpt) {
                const opt = document.createElement('option');
                opt.value = matchingOpt.value;
                opt.textContent = matchingOpt.text + ` (${pv.team} Home)`;
                venueSelect.appendChild(opt);
            }
        });

        // Add the rest
        const priorityVenueValues = priorityVenues.map(pv => pv.venue);
        originalVenues.forEach(v => {
            if (!priorityVenueValues.includes(v.value)) {
                const opt = document.createElement('option');
                opt.value = v.value;
                opt.textContent = v.text;
                venueSelect.appendChild(opt);
            }
        });

        // Restore previously selected venue if still valid
        if (currentVenue) {
            venueSelect.value = currentVenue;
        }
    };

    team1Select.addEventListener('change', updateDynamicOptions);
    team2Select.addEventListener('change', updateDynamicOptions);

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!validateSameTeam()) return;

        // Collect data
        const formData = new FormData(form);
        const submitData = Object.fromEntries(formData.entries());
        
        // Update UI info
        document.getElementById('res-t1-name').textContent = submitData.team1 || 'Team 1';
        document.getElementById('res-t2-name').textContent = submitData.team2 || 'Team 2';
        
        resultContainer.classList.remove('hidden');
        
        // Reset bars
        document.getElementById('res-t1-bar').style.width = '0%';
        document.getElementById('res-t2-bar').style.width = '0%';
        document.getElementById('res-t1-val').textContent = '0%';
        document.getElementById('res-t2-val').textContent = '0%';
        document.getElementById('res-winner').textContent = 'Calculating...';

        try {
            const response = await fetch('/predict_match', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(submitData)
            });
            const data = await response.json();
            
            if (data.error) {
                alert(data.error);
                return;
            }

            // Animate progress bars
            setTimeout(() => {
                document.getElementById('res-t1-bar').style.width = `${data.team1_prob}%`;
                document.getElementById('res-t2-bar').style.width = `${data.team2_prob}%`;
                
                // Animate numbers
                animateValue('res-t1-val', 0, data.team1_prob, 1000);
                animateValue('res-t2-val', 0, data.team2_prob, 1000);
                
                document.getElementById('res-winner').textContent = data.winner;
            }, 100);

        } catch (err) {
            console.error(err);
            alert("Failed to reach server.");
        }
    });

    // Number Counter Animation
    function animateValue(id, start, end, duration) {
        const obj = document.getElementById(id);
        let startTimestamp = null;
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            obj.innerHTML = (progress * (end - start) + start).toFixed(2) + "%";
            if (progress < 1) {
                window.requestAnimationFrame(step);
            }
        };
        window.requestAnimationFrame(step);
    }

    // Simulator logic
    const slider = document.getElementById('years');
    const yearsVal = document.getElementById('years-val');
    slider.addEventListener('input', (e) => {
        yearsVal.textContent = e.target.value;
    });

    const simBtn = document.getElementById('run-sim-btn');
    const timelineContainer = document.getElementById('timeline-container');
    const timelineList = document.getElementById('timeline-list');

    simBtn.addEventListener('click', async () => {
        const years = slider.value;
        simBtn.disabled = true;
        simBtn.textContent = 'Simulating...';

        try {
            const res = await fetch(`/simulate_future?years=${years}`);
            const data = await res.json();
            
            timelineList.innerHTML = '';
            timelineContainer.classList.remove('hidden');

            // Render sequentially
            data.results.forEach((item, idx) => {
                const li = document.createElement('li');
                li.className = 'timeline-item';
                li.style.animationDelay = `${idx * 0.1}s`;
                
                li.innerHTML = `
                    <div class="timeline-content">
                        <div class="timeline-year">Season ${item.year}</div>
                        <div class="timeline-winner">${item.winner}</div>
                        <div class="timeline-runner">Runner-up: ${item.runner_up}</div>
                    </div>
                `;
                timelineList.appendChild(li);
            });
            
        } catch (err) {
            console.error(err);
        } finally {
            simBtn.disabled = false;
            simBtn.textContent = 'Run Simulation';
        }
    });
});
