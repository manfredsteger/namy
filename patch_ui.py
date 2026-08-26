import re

with open('App.tsx', 'r') as f:
    content = f.read()

buttons_replace = """
            <button
              onClick={handleDownloadScript}
              className="flex items-center gap-2 bg-gray-800 text-white font-bold py-3 px-6 rounded-lg hover:bg-gray-700 transition-colors"
            >
              <DownloadIcon />
              <span>{t('common.downloadScript')}</span>
            </button>
            {appMode === 'direct' && undoHistory && undoHistory.length > 0 && (
              <button
                onClick={handleUndoDirect}
                disabled={isRenaming}
                className="flex items-center gap-2 bg-amber-500 text-white font-bold py-3 px-6 rounded-lg hover:bg-amber-600 transition-colors disabled:bg-gray-600"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                </svg>
                <span>{t('app.directMode.undoButton')}</span>
              </button>
            )}
            {appMode === 'direct' ? (
              <button
                onClick={handleApplyInPlace}
                disabled={isRenaming}
                className="flex items-center gap-2 bg-primary-500 text-white font-bold py-3 px-6 rounded-lg hover:bg-primary-600 transition-colors disabled:bg-gray-600"
              >
"""

content = re.sub(
    r'<button\s*onClick=\{handleDownloadScript\}(.*?)</button>\s*\{appMode === \'direct\' \? \(\s*<button\s*onClick=\{handleApplyInPlace\}',
    buttons_replace,
    content,
    flags=re.DOTALL
)

with open('App.tsx', 'w') as f:
    f.write(content)

