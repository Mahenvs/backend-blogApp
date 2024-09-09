interface user {
    id: string;
    username: string;
    password: string;
    email: string;
    createdAt: Date
}

interface posts {
    id: string;
    title: string;
    description: string;
    user_id:  id(reference user);
    createdAt: Date
}

interface postDetails{
    id:string;
    post_id: id(reference post);
    likes: number;
    responses: posts[];
    isBookmarked: boolean;
    isLiked:boolean;
    
}