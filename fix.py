with open('App.tsx', 'r') as f:
    content = f.read()

content = content.replace('''              <button
                onClick={handleApplyInPlace}
                disabled={isRenaming}
                className="flex items-center gap-2 bg-primary-500 text-white font-bold py-3 px-6 rounded-lg hover:bg-primary-600 transition-colors disabled:bg-gray-600"
              >

                disabled={isRenaming}
                className="flex items-center gap-2 bg-primary-500 text-white font-bold py-3 px-6 rounded-lg hover:bg-primary-600 transition-colors disabled:bg-gray-600"
              >''', '''              <button
                onClick={handleApplyInPlace}
                disabled={isRenaming}
                className="flex items-center gap-2 bg-primary-500 text-white font-bold py-3 px-6 rounded-lg hover:bg-primary-600 transition-colors disabled:bg-gray-600"
              >''')

with open('App.tsx', 'w') as f:
    f.write(content)
