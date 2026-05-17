const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

function seededRandom(seed) {
  let s = seed;
  return function() {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (!supabaseUrl || !supabaseKey) {
    res.status(500).json({ error: 'Missing Supabase environment variables' });
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data: books, error: countError, count } = await supabase
    .from('books')
    .select('id', { count: 'exact' });

  if (countError) {
    res.status(500).json({ error: countError.message });
    return;
  }

  const total = count || (books ? books.length : 0);

  if (!total || total === 0) {
    res.status(404).json({ error: 'No books found' });
    return;
  }

  const seedParam = req.query.seed;
  let randomIndex;

  if (seedParam !== undefined) {
    const seed = parseInt(seedParam, 10);
    if (isNaN(seed)) {
      res.status(400).json({ error: 'Seed must be a valid integer' });
      return;
    }
    const rng = seededRandom(seed);
    randomIndex = Math.floor(rng() * total);
  } else {
    randomIndex = Math.floor(Math.random() * total);
  }

  const { data: selectedBook } = await supabase
    .from('books')
    .select('id')
    .range(randomIndex, randomIndex)
    .single();

  if (!selectedBook) {
    res.status(404).json({ error: 'Book not found at index' });
    return;
  }

  const selectedId = selectedBook.id;

  const { data: book, error } = await supabase
    .from('books')
    .select('*')
    .eq('id', selectedId)
    .single();

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.status(200).json({
    seed: seedParam !== undefined ? parseInt(seedParam, 10) : null,
    total,
    book,
  });
};
