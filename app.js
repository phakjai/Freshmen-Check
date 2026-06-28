const CACHE_KEY = 'shirt_data'
const CACHE_TIME_KEY = 'shirt_data_time'
const CACHE_TTL = 5 * 60 * 1000

// TODO: ใส่ URL ของ Apps Script endpoint ตรงนี้
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwGXqRZyvBgP-XqvZR3Seh24-6qUtvsHnT9Ed5xbcraywmTXy6JDm_0ggorAzYkQgeo/exec'

// TODO: ใส่ชื่อคณะที่ต้องการ
const FACULTIES = [
  { value: 'เทคโน',   label: 'คณะเทคโนโลยีและการจัดการอุตสาหกรรม',  formUrl: 'https://forms.gle/cZ2PPbQxmLKEW2yK9' },
  { value: 'วิศวะ',   label: 'คณะวิศวกรรมศาสตร์',                    formUrl: 'https://forms.gle/aRB1ubfdzwAnya8h8' },
  { value: 'อก.',     label: 'คณะอุตสาหกรรมเกษตรดิจิทัล',            formUrl: 'https://forms.gle/PMT9Xwn6psKjrsHw9' },
  { value: 'บริหาร',  label: 'คณะบริหารธุรกิจและอุตสาหกรรมบริการ',   formUrl: 'https://forms.gle/k6gcqZY5pbbVYgeA8' },
]

let countdownInterval = null
let cachedData = null

// --- Dropdown ---

function initFaculties() {
  const menu = document.getElementById('dropdown-menu')
  FACULTIES.forEach(f => {
    const item = document.createElement('button')
    item.type = 'button'
    item.textContent = f.label
    item.className = 'w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-primary-50 hover:text-primary-700 transition-colors'
    item.onclick = () => selectFaculty(f.value, f.label)
    menu.appendChild(item)
  })
}

function toggleDropdown() {
  const menu = document.getElementById('dropdown-menu')
  const arrow = document.getElementById('dropdown-arrow')
  const isOpen = !menu.classList.contains('hidden')
  if (isOpen) {
    menu.classList.add('hidden')
    arrow.style.transform = ''
  } else {
    menu.classList.remove('hidden')
    arrow.style.transform = 'rotate(180deg)'
  }
}

function selectFaculty(value, label) {
  document.getElementById('faculty').value = value
  const el = document.getElementById('dropdown-label')
  el.textContent = label
  el.classList.remove('text-gray-400')
  el.classList.add('text-gray-700')
  document.getElementById('dropdown-menu').classList.add('hidden')
  document.getElementById('dropdown-arrow').style.transform = ''
  restartCountdown(value)
}

document.addEventListener('click', (e) => {
  if (!document.getElementById('dropdown-wrap').contains(e.target)) {
    document.getElementById('dropdown-menu').classList.add('hidden')
    document.getElementById('dropdown-arrow').style.transform = ''
  }
})

// --- Cache & Data ---

async function fetchFromSource(faculty) {
  if (!APPS_SCRIPT_URL) return []
  const res = await fetch(`${APPS_SCRIPT_URL}?faculty=${encodeURIComponent(faculty)}`)
  return await res.json()
}

async function getData(faculty) {
  const key = `${CACHE_KEY}_${faculty}`
  const keyTime = `${CACHE_TIME_KEY}_${faculty}`
  const cached = localStorage.getItem(key)
  const cachedTime = localStorage.getItem(keyTime)
  if (cached && cachedTime && (Date.now() - Number(cachedTime)) < CACHE_TTL) {
    return JSON.parse(cached)
  }
  const fresh = await fetchFromSource(faculty)
  localStorage.setItem(key, JSON.stringify(fresh))
  localStorage.setItem(keyTime, String(Date.now()))
  restartCountdown(faculty)
  return fresh
}

async function forceRefresh(faculty) {
  localStorage.removeItem(`${CACHE_KEY}_${faculty}`)
  localStorage.removeItem(`${CACHE_TIME_KEY}_${faculty}`)
  setStatusDot('loading')
  await getData(faculty)
  setStatusDot('live')
}

// --- Countdown ---

function restartCountdown(faculty) {
  if (countdownInterval) clearInterval(countdownInterval)
  if (!faculty) return
  document.getElementById('countdown-wrap').classList.remove('hidden')
  const el = document.getElementById('countdown')
  countdownInterval = setInterval(() => {
    const cachedTime = Number(localStorage.getItem(`${CACHE_TIME_KEY}_${faculty}`) || 0)
    const remaining = Math.max(0, CACHE_TTL - (Date.now() - cachedTime))
    const m = Math.floor(remaining / 60000)
    const s = Math.floor((remaining % 60000) / 1000)
    el.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    if (remaining === 0) forceRefresh(faculty)
  }, 1000)
}

function setStatusDot(state) {
  const dot = document.getElementById('status-dot')
  dot.className = 'w-2 h-2 rounded-full ' + (state === 'live' ? 'bg-green-400' : 'bg-yellow-400')
}

// --- Check ---

async function checkEligibility() {
  const faculty = document.getElementById('faculty').value.trim()
  const studentId = document.getElementById('student-id').value.trim()

  if (!faculty || !studentId) {
    showError('กรุณากรอกข้อมูลให้ครบทุกช่อง')
    return
  }

  document.getElementById('loading').classList.remove('hidden')
  document.getElementById('result').classList.add('hidden')

  const rows = await getData(faculty)

  document.getElementById('loading').classList.add('hidden')

  const match = rows.find(row =>
    String(row['รหัสนักศึกษา']).trim() === studentId
  )

  if (match) showSuccess(match)
  else showNotFound()
}

// --- Result UI ---

function openModal() {
  const backdrop = document.getElementById('modal-backdrop')
  const modal = document.getElementById('modal')
  backdrop.classList.remove('hidden')
  setTimeout(() => modal.classList.remove('hidden'), 10)
}

function closeModal(e) {
  if (e && e.target !== document.getElementById('modal-backdrop')) return
  const backdrop = document.getElementById('modal-backdrop')
  const modal = document.getElementById('modal')
  modal.classList.add('hidden')
  backdrop.classList.add('hidden')
}

function showSuccess(data) {
  const el = document.getElementById('result')
  el.className = 'result-card'
  el.innerHTML = `
    <div class="bg-white overflow-hidden">
      <div class="bg-primary-600 px-5 py-4 flex items-center gap-3">
        <div class="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
          <svg class="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6 9 17l-5-5"/></svg>
        </div>
        <div>
          <p class="text-white/70 text-xs">ผลการตรวจสอบ</p>
          <p class="text-white font-semibold text-base">มีสิทธิ์รับเสื้อ</p>
        </div>
      </div>
      <div class="bg-white px-5 py-4 flex flex-col gap-3">
        ${data['ไซส์เสื้อ'] ? `
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <div class="w-7 h-7 rounded-lg bg-primary-50 flex items-center justify-center">
              <svg class="w-4 h-4 text-primary-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.57a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.57a2 2 0 0 0-1.34-2.23z"/></svg>
            </div>
            <span class="text-sm text-gray-500">ไซส์เสื้อ</span>
          </div>
          <span class="text-sm font-semibold text-gray-800 bg-gray-100 px-3 py-1 rounded-lg">${data['ไซส์เสื้อ']}</span>
        </div>` : ''}
        ${data['สาขา'] ? `
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <div class="w-7 h-7 rounded-lg bg-primary-50 flex items-center justify-center">
              <svg class="w-4 h-4 text-primary-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            </div>
            <span class="text-sm text-gray-500">สาขา</span>
          </div>
          <span class="text-sm font-semibold text-gray-800">${data['สาขา']}</span>
        </div>` : ''}
      </div>
    </div>
  `
  openModal()
  fireConfetti()
}

function fireConfetti() {
  const colors = ['#9B1C1C', '#D94F4F', '#F4BABA', '#ffffff', '#FAE0E0']
  confetti({ particleCount: 60, angle: 120, spread: 70, origin: { x: 0, y: 0.85 }, colors })
  confetti({ particleCount: 60, angle: 60,  spread: 70, origin: { x: 1, y: 0.85 }, colors })
  setTimeout(() => {
    confetti({ particleCount: 40, angle: 90, spread: 60, origin: { x: 0.5, y: 1 }, colors })
  }, 200)
}

function showNotFound() {
  const el = document.getElementById('result')
  el.className = ''
  el.innerHTML = `
    <div class="bg-white px-5 pt-6 pb-4 text-center">
      <div class="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
        <svg class="w-6 h-6 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/></svg>
      </div>
      <p class="text-base font-semibold text-gray-700">ไม่พบข้อมูลในระบบ</p>
      <p class="text-xs text-gray-400 mt-1">กรุณาตรวจสอบข้อมูลที่กรอก<br/>หรือติดต่อผู้ดูแลระบบ</p>
    </div>
  `
  openModal()
}

function showError(msg) {
  const el = document.getElementById('inline-error')
  if (!el) return
  el.textContent = msg
  el.classList.remove('hidden')
  setTimeout(() => el.classList.add('hidden'), 3000)
}

// --- Tabs ---

function switchTab(tab) {
  const isCheck = tab === 'check'
  document.getElementById('panel-check').classList.toggle('hidden', !isCheck)
  document.getElementById('panel-form').classList.toggle('hidden', isCheck)
  document.getElementById('tab-check').className = `flex-1 py-3.5 text-sm font-medium transition-colors border-b-2 ${isCheck ? 'text-primary-600 border-primary-600' : 'text-gray-400 border-transparent hover:text-gray-600'}`
  document.getElementById('tab-form').className = `flex-1 py-3.5 text-sm font-medium transition-colors border-b-2 ${!isCheck ? 'text-primary-600 border-primary-600' : 'text-gray-400 border-transparent hover:text-gray-600'}`
}

function initFormLinks() {
  const container = document.getElementById('form-links')
  FACULTIES.forEach(f => {
    const btn = document.createElement('a')
    btn.href = f.formUrl || '#'
    btn.target = '_blank'
    btn.rel = 'noopener noreferrer'
    btn.className = `flex items-center justify-between px-4 py-3 rounded-xl border text-sm transition-all ${f.formUrl ? 'border-gray-200 text-gray-700 hover:border-primary-400 hover:text-primary-600' : 'border-gray-100 text-gray-300 cursor-not-allowed'}`
    btn.innerHTML = `<span>${f.label}</span><svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>`
    if (!f.formUrl) btn.onclick = e => e.preventDefault()
    container.appendChild(btn)
  })
}

// --- Init ---

initFaculties()
initFormLinks()
restartCountdown(null)
