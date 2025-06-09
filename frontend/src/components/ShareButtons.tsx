import React from 'react';

interface ShareButtonsProps {
    url: string;
    title? : string
}

const ShareButtons: React.FC<ShareButtonsProps> = ({
    url,
    title = 'Join my IdeaBoard room'
}) => {
    const encodedUrl = encodeURIComponent(url);
    const encodedTitle = encodeURIComponent(title);

    return(
        <div className="share-buttons">
            <a 
             href={`https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`}
             target="_blank" 
             rel="noopener noreferrer"
             className="twitter"
            >
                Twitter
            </a>
            <a 
             href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`}
             target="_blank" 
             rel="noopener noreferrer"
             className="facebook"
            >
                Facebook
            </a>
            <a 
             href={`https://api.whatsapp.com/send?text=${encodedTitle}: ${encodedUrl}`}
             target="_blank" 
             rel="noopener noreferrer"
             className="twitter"
            >
                WhatsApp
            </a>
            <a 
             href={`mailto:?subject=${encodedTitle}&body=${url}`}
             className='email'
            >
                Email
            </a>
        </div>
    )
};

export default ShareButtons;