import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

const translations = {
  ru: {
    title: 'CRM Portfolio Pro',
    totalClients: 'Всего клиентов',
    totalRevenue: 'Общая сумма сделок',
    activeDeals: 'Активных в работе',
    addTitle: 'Добавить лид / сделку',
    namePlaceholder: 'Имя клиента *',
    phonePlaceholder: 'Телефон',
    dealPlaceholder: 'Услуга / проект',
    amountPlaceholder: 'Сумма ($)',
    saveBtn: 'Сохранить в базу',
    searchPlaceholder: '🔍 Поиск по имени или телефону...',
    listTitle: 'Список',
    loading: 'Загрузка данных...',
    empty: 'Ничего не найдено.',
    deleteBtn: 'Удалить',
    phoneNotSpecified: 'Телефон не указан',
    lightTheme: '☀️ Светлая тема',
    darkTheme: '🌙 Темная тема',
    filters: { all: 'Все', new: 'Новые', in_progress: 'В работе', completed: 'Завершены', cancelled: 'Отказ' },
    statuses: { new: 'Новый', in_progress: 'В работе', completed: 'Завершен', cancelled: 'Отказ' }
  },
  en: {
    title: 'CRM Portfolio Pro',
    totalClients: 'Total Clients',
    totalRevenue: 'Total Revenue',
    activeDeals: 'Active Deals',
    addTitle: 'Add Lead / Deal',
    namePlaceholder: 'Client Name *',
    phonePlaceholder: 'Phone',
    dealPlaceholder: 'Service / Project',
    amountPlaceholder: 'Amount ($)',
    saveBtn: 'Save to DB',
    searchPlaceholder: '🔍 Search by name or phone...',
    listTitle: 'List',
    loading: 'Loading data...',
    empty: 'Nothing found.',
    deleteBtn: 'Delete',
    phoneNotSpecified: 'Phone not specified',
    lightTheme: '☀️ Light Theme',
    darkTheme: '🌙 Dark Theme',
    filters: { all: 'All', new: 'New', in_progress: 'In Progress', completed: 'Completed', cancelled: 'Cancelled' },
    statuses: { new: 'New', in_progress: 'In Progress', completed: 'Completed', cancelled: 'Cancelled' }
  },
  uz: {
    title: 'CRM Portfolio Pro',
    totalClients: 'Jami mijozlar',
    totalRevenue: 'Umumiy summa',
    activeDeals: 'Jarayondagilar',
    addTitle: 'Lid / Bitim qo\'shish',
    namePlaceholder: 'Mijoz ismi *',
    phonePlaceholder: 'Telefon',
    dealPlaceholder: 'Xizmat / Loyiha',
    amountPlaceholder: 'Summa ($)',
    saveBtn: 'Bazaga saqlash',
    searchPlaceholder: '🔍 Ism yoki telefon bo\'yicha qidirish...',
    listTitle: 'Ro\'yxat',
    loading: 'Ma\'lumotlar yuklanmoqda...',
    empty: 'Hech narsa topilmadi.',
    deleteBtn: 'O\'chirish',
    phoneNotSpecified: 'Telefon ko\'rsatilmagan',
    lightTheme: '☀️ Yorug\' rejim',
    darkTheme: '🌙 Tungi rejim',
    filters: { all: 'Barchasi', new: 'Yangi', in_progress: 'Jarayonda', completed: 'Bajarildi', cancelled: 'Bekor qilingan' },
    statuses: { new: 'Yangi', in_progress: 'Jarayonda', completed: 'Bajarildi', cancelled: 'Bekor qilingan' }
  }
}

function App() {
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [darkMode, setDarkMode] = useState(true)
  const [lang, setLang] = useState('ru')
  
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [dealTitle, setDealTitle] = useState('')
  const [dealAmount, setDealAmount] = useState('')

  const t = translations[lang]

  useEffect(() => {
    // 1. Первичная загрузка
    fetchClients()

    // 2. Подписка на Realtime-изменения в Supabase
    const channel = supabase
      .channel('realtime-clients')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'clients' },
        () => {
          // Как только пришло любое изменение (добавление, смена статуса, удаление)
          fetchClients()
        }
      )
      .subscribe()

    // Отписка при размонтировании компонента
    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  async function fetchClients() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('clients')
        .select('*, deals(*)')
        .order('created_at', { ascending: true })

      if (error) throw error
      setClients(data || [])
    } catch (error) {
      console.error('Ошибка загрузки:', error.message)
    } finally {
      setLoading(false)
    }
  }

  async function addClientWithDeal(e) {
    e.preventDefault()
    if (!fullName.trim()) return

    try {
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .insert([{ full_name: fullName, phone: phone, status: 'new' }])
        .select()

      if (clientError) throw clientError
      const newClient = clientData[0]

      let createdDeal = []
      if (dealTitle.trim()) {
        const { data: dealData, error: dealError } = await supabase
          .from('deals')
          .insert([{ 
            client_id: newClient.id, 
            title: dealTitle, 
            amount: Number(dealAmount) || 0,
            stage: 'lead'
          }])
          .select()

        if (dealError) throw dealError
        createdDeal = dealData
      }

      setClients([...clients, { ...newClient, deals: createdDeal }])
      setFullName('')
      setPhone('')
      setDealTitle('')
      setDealAmount('')
    } catch (error) {
      console.error('Ошибка добавления:', error.message)
    }
  }

  async function deleteClient(id) {
    try {
      const { error } = await supabase.from('clients').delete().eq('id', id)
      if (error) throw error
      setClients(clients.filter(c => c.id !== id))
    } catch (error) {
      console.error('Ошибка удаления:', error.message)
    }
  }

  async function updateStatus(clientId, newStatus) {
    try {
      const { error } = await supabase
        .from('clients')
        .update({ status: newStatus })
        .eq('id', clientId)

      if (error) throw error
      setClients(clients.map(c => c.id === clientId ? { ...c, status: newStatus } : c))
    } catch (error) {
      console.error('Ошибка обновления статуса:', error.message)
    }
  }

  const filteredClients = clients.filter(client => {
    const matchesFilter = filter === 'all' || client.status === filter
    const matchesSearch = client.full_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (client.phone && client.phone.includes(searchQuery))
    return matchesFilter && matchesSearch
  })

  const totalClients = clients.length
  const totalRevenue = clients.reduce((sum, client) => {
    const clientDealsSum = client.deals ? client.deals.reduce((acc, d) => acc + Number(d.amount), 0) : 0
    return sum + clientDealsSum
  }, 0)
  const activeDealsCount = clients.filter(c => c.status === 'in_progress' || c.status === 'new').length

  const theme = {
    bg: darkMode ? '#121212' : '#f4f6f8',
    cardBg: darkMode ? '#1e1e1e' : '#ffffff',
    text: darkMode ? '#e0e0e0' : '#333333',
    subText: darkMode ? '#aaaaaa' : '#666666',
    border: darkMode ? '#2e2e2e' : '#ced4da',
    inputBg: darkMode ? '#2a2a2a' : '#ffffff',
    inputColor: darkMode ? '#ffffff' : '#000000',
  }

  return (
    <div style={{ background: theme.bg, color: theme.text, minHeight: '100vh', fontFamily: 'Arial, sans-serif' }}>
      
      <style>{`
        * {
          box-sizing: border-box;
        }
        body, html {
          margin: 0;
          padding: 0;
        }
        
        /* По умолчанию (мобилки и узкие окна) */
        .app-wrapper {
          padding: 15px;
          display: flex;
          flex-direction: column;
          gap: 15px;
        }
        .main-columns {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }
        .client-list-box {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        /* Полноэкранный режим на ПК (ширина от 900px) */
        @media (min-width: 900px) {
          body, html {
            overflow: hidden;
            height: 100vh;
          }
          .app-wrapper {
            height: 100vh;
            padding: 20px 30px;
            display: flex;
            flex-direction: column;
            gap: 15px;
          }
          .main-columns {
            display: grid;
            grid-template-columns: 420px 1fr;
            gap: 25px;
            flex: 1;
            min-height: 0; /* Важно для работы flex/grid скролла */
          }
          .left-pane {
            overflow-y: auto;
          }
          .right-pane {
            display: flex;
            flex-direction: column;
            gap: 12px;
            min-height: 0;
          }
          .client-list-box {
            flex: 1;
            overflow-y: auto;
            padding-right: 6px;
          }
        }
      `}</style>

      <div className="app-wrapper">
        
        {/* Шапка */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <h2 style={{ margin: 0 }}>{t.title}</h2>
          
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value)}
              style={{
                padding: '6px 12px',
                borderRadius: '20px',
                border: `1px solid ${theme.border}`,
                background: theme.inputBg,
                color: theme.inputColor,
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '13px'
              }}>
              <option value="ru">Русский</option>
              <option value="en">English</option>
              <option value="uz">Oʻzbekcha</option>
            </select>

            <button
              onClick={() => setDarkMode(!darkMode)}
              style={{
                background: darkMode ? '#ffc107' : '#343a40',
                color: darkMode ? '#000' : '#fff',
                border: 'none',
                padding: '7px 14px',
                borderRadius: '20px',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '13px'
              }}>
              {darkMode ? t.lightTheme : t.darkTheme}
            </button>
          </div>
        </div>

        {/* Метрики */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
          <div style={{ background: theme.cardBg, padding: '14px', borderRadius: '8px', border: `1px solid ${theme.border}`, textAlign: 'center' }}>
            <div style={{ fontSize: '13px', color: theme.subText }}>{t.totalClients}</div>
            <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#0d6efd' }}>{totalClients}</div>
          </div>
          <div style={{ background: theme.cardBg, padding: '14px', borderRadius: '8px', border: `1px solid ${theme.border}`, textAlign: 'center' }}>
            <div style={{ fontSize: '13px', color: theme.subText }}>{t.totalRevenue}</div>
            <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#198754' }}>${totalRevenue}</div>
          </div>
          <div style={{ background: theme.cardBg, padding: '14px', borderRadius: '8px', border: `1px solid ${theme.border}`, textAlign: 'center' }}>
            <div style={{ fontSize: '13px', color: theme.subText }}>{t.activeDeals}</div>
            <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#ffc107' }}>{activeDealsCount}</div>
          </div>
        </div>

        {/* Основной блок */}
        <div className="main-columns">
          
          {/* СЛЕВА: Меню ввода */}
          <div className="left-pane">
            <div style={{ background: theme.cardBg, padding: '20px', borderRadius: '8px', border: `1px solid ${theme.border}` }}>
              <h3 style={{ marginTop: 0 }}>{t.addTitle}</h3>
              <form onSubmit={addClientWithDeal} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <input
                  type="text"
                  placeholder={t.namePlaceholder}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  style={{ padding: '11px', borderRadius: '6px', border: `1px solid ${theme.border}`, background: theme.inputBg, color: theme.inputColor }}
                />
                <input
                  type="text"
                  placeholder={t.phonePlaceholder}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  style={{ padding: '11px', borderRadius: '6px', border: `1px solid ${theme.border}`, background: theme.inputBg, color: theme.inputColor }}
                />
                <input
                  type="text"
                  placeholder={t.dealPlaceholder}
                  value={dealTitle}
                  onChange={(e) => setDealTitle(e.target.value)}
                  style={{ padding: '11px', borderRadius: '6px', border: `1px solid ${theme.border}`, background: theme.inputBg, color: theme.inputColor }}
                />
                <input
                  type="number"
                  placeholder={t.amountPlaceholder}
                  value={dealAmount}
                  onChange={(e) => setDealAmount(e.target.value)}
                  style={{ padding: '11px', borderRadius: '6px', border: `1px solid ${theme.border}`, background: theme.inputBg, color: theme.inputColor }}
                />
                <button type="submit" style={{ background: '#0d6efd', color: 'white', border: 'none', padding: '12px', cursor: 'pointer', borderRadius: '6px', fontWeight: 'bold', fontSize: '15px' }}>
                  {t.saveBtn}
                </button>
              </form>
            </div>
          </div>

          {/* СПРАВА: Поиск, фильтры и прокручивающийся список клиентов */}
          <div className="right-pane">
            
            <input
              type="text"
              placeholder={t.searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%', padding: '11px', borderRadius: '6px', border: `1px solid ${theme.border}`, background: theme.inputBg, color: theme.inputColor }}
            />

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {Object.entries(t.filters).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '20px',
                    border: `1px solid ${theme.border}`,
                    background: filter === key ? '#0d6efd' : theme.cardBg,
                    color: filter === key ? '#fff' : theme.text,
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: filter === key ? 'bold' : 'normal'
                  }}>
                  {label}
                </button>
              ))}
            </div>

            <h3 style={{ margin: '4px 0' }}>{t.listTitle} ({filteredClients.length})</h3>

            {/* Внутренний скролл только для карточек */}
            <div className="client-list-box">
              {loading ? (
                <p>{t.loading}</p>
              ) : filteredClients.length === 0 ? (
                <p style={{ color: theme.subText }}>{t.empty}</p>
              ) : (
                filteredClients.map((client) => (
                  <div key={client.id} style={{ background: theme.cardBg, border: `1px solid ${theme.border}`, padding: '15px', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '16px', fontWeight: 'bold' }}>{client.full_name}</div>
                      <div style={{ fontSize: '14px', color: theme.subText, margin: '4px 0' }}>{client.phone || t.phoneNotSpecified}</div>
                      
                      {client.deals && client.deals.length > 0 && (
                        <div style={{ background: darkMode ? '#262626' : '#f1f3f5', padding: '6px 10px', borderRadius: '4px', fontSize: '13px', marginTop: '6px' }}>
                          💼 <strong>{client.deals[0].title}</strong> — <span style={{ color: '#198754', fontWeight: 'bold' }}>${client.deals[0].amount}</span>
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
                      <select
                        value={client.status}
                        onChange={(e) => updateStatus(client.id, e.target.value)}
                        style={{
                          padding: '6px 10px',
                          borderRadius: '4px',
                          border: `1px solid ${theme.border}`,
                          background: theme.inputBg,
                          color: theme.inputColor,
                          fontSize: '12px',
                          fontWeight: 'bold',
                          cursor: 'pointer'
                        }}>
                        {Object.entries(t.statuses).map(([val, label]) => (
                          <option key={val} value={val}>{label}</option>
                        ))}
                      </select>

                      <button 
                        onClick={() => deleteClient(client.id)}
                        style={{ background: '#dc3545', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>
                        {t.deleteBtn}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

          </div>

        </div>

      </div>

    </div>
  )
}

export default App
