import { useState } from 'react'

interface PhotoFilter {
  tags: string[]
  photographer: string
  taken_from: string
  taken_to: string
  created_from: string
  created_to: string
  keyword: string
}

interface PhotoFilterPanelProps {
  value: PhotoFilter
  onChange: (val: PhotoFilter) => void
  allTags?: string[]
}

export default function PhotoFilterPanel({ value, onChange, allTags = [] }: PhotoFilterPanelProps) {
  const handleChange = (field: keyof PhotoFilter, val: any) => {
    onChange({ ...value, [field]: val })
  }
  const reset = () => {
    onChange({
      tags: [], photographer: '', taken_from: '', taken_to: '', created_from: '', created_to: '', keyword: ''
    })
  }
  return (
    <div className="bg-white rounded-lg shadow p-4 flex flex-wrap gap-4 items-end mb-6">
      <div>
        <label className="block text-gray-700 mb-1">标签</label>
        <select multiple className="border rounded p-2 w-40 h-20" value={value.tags} onChange={e => handleChange('tags', Array.from(e.target.selectedOptions, o => o.value))}>
          {allTags.map(tag => <option key={tag} value={tag}>{tag}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-gray-700 mb-1">拍摄人</label>
        <input className="border rounded p-2 w-32" value={value.photographer} onChange={e => handleChange('photographer', e.target.value)} />
      </div>
      <div>
        <label className="block text-gray-700 mb-1">拍摄时间</label>
        <input type="date" className="border rounded p-2 w-36 mb-1" value={value.taken_from} onChange={e => handleChange('taken_from', e.target.value)} />
        <span className="mx-1">-</span>
        <input type="date" className="border rounded p-2 w-36" value={value.taken_to} onChange={e => handleChange('taken_to', e.target.value)} />
      </div>
      <div>
        <label className="block text-gray-700 mb-1">上传时间</label>
        <input type="date" className="border rounded p-2 w-36 mb-1" value={value.created_from} onChange={e => handleChange('created_from', e.target.value)} />
        <span className="mx-1">-</span>
        <input type="date" className="border rounded p-2 w-36" value={value.created_to} onChange={e => handleChange('created_to', e.target.value)} />
      </div>
      <div>
        <label className="block text-gray-700 mb-1">关键字</label>
        <input className="border rounded p-2 w-40" value={value.keyword} onChange={e => handleChange('keyword', e.target.value)} placeholder="标题/描述" />
      </div>
      <button className="ml-2 px-4 py-2 bg-gray-200 text-gray-700 rounded" onClick={reset}>重置</button>
    </div>
  )
} 