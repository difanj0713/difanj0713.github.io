document.addEventListener('DOMContentLoaded', function() {
    // Highlight current page in navigation
    const currentLocation = window.location.pathname;
    const navLinks = document.querySelectorAll('nav a');
    
    navLinks.forEach(link => {
        const linkPath = link.getAttribute('href');
        if (currentLocation.endsWith(linkPath)) {
            link.classList.add('active');
        } else if (currentLocation.endsWith('/') && linkPath === 'index.html') {
            link.classList.add('active');
        }
    });

    // Toggle abstract expansion for publications
    const readMoreLinks = document.querySelectorAll('.read-more');
    const readLessLinks = document.querySelectorAll('.read-less');
    
    readMoreLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const publicationId = this.getAttribute('data-publication-id');
            const fullAbstract = document.getElementById(publicationId + '-abstract');
            
            if (fullAbstract) {
                this.parentElement.style.display = 'none';
                fullAbstract.style.display = 'block';
            }
        });
    });
    
    readLessLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const publicationId = this.getAttribute('data-publication-id');
            const shortAbstract = document.querySelector(`.abstract-short[data-publication-id="${publicationId}"]`) || 
                                  document.querySelector(`.read-more[data-publication-id="${publicationId}"]`).parentElement;
            const fullAbstract = document.getElementById(publicationId + '-abstract');
            
            if (fullAbstract && shortAbstract) {
                fullAbstract.style.display = 'none';
                shortAbstract.style.display = 'block';
            }
        });
    });
    
    // Make PDF objects clickable
    const pdfObjects = document.querySelectorAll('.pdf-object');
    pdfObjects.forEach(pdf => {
        pdf.addEventListener('click', function() {
            const pdfSrc = this.getAttribute('data');
            openPDFModal(pdfSrc);
        });
    });
});

// Modal for PDF display
function openPDFModal(pdfSrc) {
    const modal = document.getElementById('pdfModal');
    const modalPDF = document.getElementById('modalPDFObject');
    
    modal.style.display = 'block';
    modalPDF.setAttribute('data', pdfSrc);
    
    // Prevent scrolling of the body when modal is open
    document.body.style.overflow = 'hidden';
}

function closePDFModal() {
    const modal = document.getElementById('pdfModal');
    modal.style.display = 'none';
    
    // Re-enable scrolling
    document.body.style.overflow = 'auto';
}

// Close modal when clicking outside the PDF
window.onclick = function(event) {
    const modal = document.getElementById('pdfModal');
    if (event.target === modal) {
        closePDFModal();
    }
}

// Close modal with Escape key
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        closePDFModal();
    }
});