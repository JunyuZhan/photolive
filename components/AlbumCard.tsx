import Image from 'next/image'
import { LOCAL_STORAGE_URL } from '@/lib/localStorage'
import Link from 'next/link'

interface Album {
  id: string
  name: string
  description?: string
  cover_photo?: string | null
  photo_count: number
}

interface AlbumCardProps {
  album: Album
}

export default function AlbumCard({ album }: AlbumCardProps) {
  return (
    <Link href={`/albums/${album.id}`}>
      <div className="bg-white rounded-lg shadow hover:shadow-md transition-shadow duration-300 overflow-hidden cursor-pointer">
        <div className="w-full h-48 relative bg-gray-100">
          {album.cover_photo ? (
            <Image
              src={`${LOCAL_STORAGE_URL}/photos/${album.cover_photo}`}
              alt={album.name}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, 33vw"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="h-16 w-16 text-gray-300" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={1} 
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" 
                />
              </svg>
            </div>
          )}
        </div>
        <div className="p-4">
          <h3 className="text-lg font-semibold">{album.name}</h3>
          {album.description && (
            <p className="text-gray-600 text-sm mt-1">{album.description}</p>
          )}
          <div className="flex items-center mt-2 text-sm text-gray-500">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-4 w-4 mr-1" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" 
              />
            </svg>
            {album.photo_count} 张照片
          </div>
        </div>
      </div>
    </Link>
  )
} 