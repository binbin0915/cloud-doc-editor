import React from 'react'

export default function Location({location, onClick, placeholder, title}) {
    return (
        <div className="form-group">
            <label htmlFor="location">{title}</label>
            <div className="input-group mb-2">
                <input value={location}
                       type="text"
                       id="location"
                       className="form-control"
                       placeholder={placeholder}
                       readOnly/>
                <div className="input-group-append">
                    <button className="btn btn-outline-primary"
                            type="button"
                            id="select-new-location"
                            onClick={onClick}
                    >选择新的位置
                    </button>
                </div>
            </div>
        </div>
    )
}
